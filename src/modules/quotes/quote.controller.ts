import { FastifyReply, FastifyRequest } from 'fastify'
import { GuessInput } from './quote.schema'
import prisma from '../../utils/prisma'
import redis, { redisUtils } from '../../utils/redis'
import { COOLDOWN_SECONDS, isGuessCorrect, normalize, notFoundUserCheck, validateQuote } from '../../utils/common_methods'
import { Prioritize, NextQuoteQuery } from './quote.schema'
import { sendDiscountEmail } from '../../utils/email'
import { GuessTxResult, AuthorStats } from '../../utils/types'

export async function getNextQuote(
  req: FastifyRequest<{ Querystring: NextQuoteQuery }>,
  reply: FastifyReply
) {
  notFoundUserCheck(req, reply)
  const query = req.query as NextQuoteQuery
  const prioritize = query.prioritize ?? Prioritize.wrong
  const userId = Number(req.user?.id)
  //Result tweaked to make the user choose if they want difficult options or easier ones
  const order = prioritize === 'correct'
    ? { guessed_correct: 'desc' as const }
    : { guessed_false: 'desc' as const }
  const where = {
    OR: [
      { attempts: { none: { userId } } },
      { attempts: { some: { userId, correct: false } } },
    ],
  }
  const count = await prisma.quote.count({
    where: where
  });

  // Generate random skip value
  const skip = Math.floor(Math.random() * count);

  const findNext = () => prisma.quote.findFirst({
    where: where,
    orderBy: order,
    skip: skip,
    select: { id: true, content: true },
  })
  let next = await findNext()
  if (!next) {
    const res = await req.server.syncQuotes()
    if (res.createdCount > 0) next = await findNext()
    if (!next) return reply.code(404).send({ message: 'We ran out of quotes, try again tomorrow' })
  }

  return reply.code(200).send({ data: next })
}

async function handleCorrectGuess(userId: number, quoteId: number, author: string): Promise<GuessTxResult> {
  return await prisma.$transaction(async (tx): Promise<GuessTxResult> => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId },
      select: { right_guessed_authors: true, email: true },
    })

    const authorStats = (currentUser?.right_guessed_authors as Record<string, AuthorStats> | null) || {}
    
    if (!authorStats[author]) {
      authorStats[author] = { count: 0, email_sent: false }
    }
    
    authorStats[author].count += 1
    const newCount = authorStats[author].count
    const email = currentUser?.email || null
    const email_sent_for_author = authorStats[author].email_sent

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { 
        score: { increment: 1 }, 
        right_guessed_authors: authorStats 
      },
      select: { score: true },
    })

    await tx.quote.update({
      where: { id: quoteId },
      data: { guessed_correct: { increment: 1 } },
      select: { id: true },
    })

    await tx.userQuoteAttempt.upsert({
      where: { userId_quoteId: { userId, quoteId } },
      update: { correct: true },
      create: { userId, quoteId, correct: true },
    })

    return { 
      user: updatedUser, 
      newCount, 
      email, 
      author, 
      email_sent_for_author, 
      authorStats 
    }
  })
}

async function handleDiscountEmail(
  userId: number, 
  email: string | null, 
  author: string, 
  newCount: number, 
  emailAlreadySent: boolean,
  authorStats: Record<string, AuthorStats>,
  logger: any
) {
  const shouldSendEmail = newCount >= Number(process.env.EMAIL_THRESHOLD) && email && !emailAlreadySent
  
  if (!shouldSendEmail) {
    return
  }

  try {
    await sendDiscountEmail(email, author)
    
    authorStats[author].email_sent = true
    await prisma.user.update({
      where: { id: userId },
      data: { right_guessed_authors: authorStats },
      select: { id: true },
    })
  } catch (error: any) {
    logger.error('Failed to send discount email', error)
  }
}

async function handleIncorrectGuess(userId: number, quoteId: number) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { guessed_false: { increment: 1 } },
    select: { id: true },
  })

  await prisma.userQuoteAttempt.upsert({
    where: { userId_quoteId: { userId, quoteId } },
    update: { correct: false },
    create: { userId, quoteId, correct: false },
  })

  await redisUtils.setWithExpiry(
    `${userId}:failed_attempt`, 
    new Date().toISOString(), 
    COOLDOWN_SECONDS
  )
}

export async function guessAuthor(
  req: FastifyRequest<{ Body: GuessInput }>,
  reply: FastifyReply
) {
  try {
    await notFoundUserCheck(req, reply)
    
    const { quoteId, authorGuess } = req.body
    const userId = Number(req.user?.id)
    
    const quote = await validateQuote(quoteId)
    
    const isCorrect = isGuessCorrect(quote.author, authorGuess)
    
    if (isCorrect) {
      const { user, newCount, email, author, email_sent_for_author, authorStats } = 
        await handleCorrectGuess(userId, quoteId, quote.author)
      
      await handleDiscountEmail(
        userId, 
        email, 
        author, 
        newCount, 
        email_sent_for_author, 
        authorStats, 
        req.log
      )
      
      return reply.code(200).send({ 
        correct: true, 
        message: 'Correct answer', 
        newScore: user.score 
      })
    }
    
    await handleIncorrectGuess(userId, quoteId)
    
    return reply.code(200).send({ 
      correct: false, 
      message: 'Wrong answer, try again tomorrow' 
    })
    
  } catch (error: any) {
    if (error.message === 'Quote not found') {
      return reply.code(404).send({ message: 'Quote not found' })
    }
    
    req.log.error('Failed to process guess:', error)
    return reply.code(500).send({ 
      message: error.message || 'Unknown error' 
    })
  }
}