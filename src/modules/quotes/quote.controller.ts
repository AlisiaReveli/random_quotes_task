import { FastifyReply, FastifyRequest } from 'fastify'
import { GuessInput } from './quote.schema'
import prisma from '../../utils/prisma'
import { redisUtils } from '../../utils/redis'
import { COOLDOWN_SECONDS, isGuessCorrect, normalize, notFoundUserCheck, validateQuote } from '../../utils/common_methods'
import { Prioritize, NextQuoteQuery } from './quote.schema'
import { sendDiscountEmail } from '../../utils/email'
import { GuessTxResult, AuthorStats } from '../../utils/types'
import { quotesLog } from '../../utils/logger'
import { createResponse } from '../../utils/response'
export async function getNextQuote(
  req: FastifyRequest<{ Querystring: NextQuoteQuery }>,
  reply: FastifyReply
) {
  notFoundUserCheck(req, reply)
  const query = req.query as NextQuoteQuery
  const prioritize = query.prioritize ?? Prioritize.wrong
  const userId = Number(req.user?.id)
  //Result tweaked to make the user choose if they want difficult options or easier ones
  // For 'correct': prioritize quotes that are generally easier (higher guessed_correct)
  // For 'wrong': prioritize quotes that are generally harder (higher guessed_false)
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

  const findNext = () => prisma.quote.findMany({
    where: where,
    orderBy: order,
    take: 5,
    select: { id: true, content: true },
  })
  let next = await findNext()
  if (next.length === 0) {
    const res = await req.server.syncQuotes()
    if (res.createdCount > 0) next = await findNext()
    if (next.length === 0) return reply.code(404).send(createResponse.error('We ran out of quotes, try again tomorrow', 404))
  }
  const randomIndex = Math.floor(Math.random() * next.length)
  const selectedQuote = next[randomIndex];
  console.log(selectedQuote)

  return reply.code(200).send(createResponse.success({ quote: selectedQuote }, 'Quote retrieved successfully'))
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
      quotesLog.info({ userId, quoteId, author: quote.author }, 'User guessed correctly')

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

      return reply.code(200).send(createResponse.success({
        correct: true,
        newScore: user.score
      }, 'Correct answer'))

    }

    await handleIncorrectGuess(userId, quoteId)

    return reply.code(200).send(createResponse.success({
      correct: false
    }, 'Wrong answer, try again tomorrow'))

  } catch (error: any) {
    if (error.message === 'Quote not found') {
      return reply.code(404).send(createResponse.error('Quote not found', 404))
    }

    req.log.error('Failed to process guess:', error)
    return reply.code(500).send(createResponse.error('Internal server error', 500, error.message))
  }
}

export async function getRelatedQuotes(
  req: FastifyRequest<{ Params: { quoteId: string } }>,
  reply: FastifyReply
) {
  try {
    const quoteId = parseInt(req.params.quoteId, 10)

    if (isNaN(quoteId) || quoteId <= 0) {
      return reply.code(400).send(createResponse.error('Invalid quote ID', 400))
    }

    const originalQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, content: true, author: true }
    })

    if (!originalQuote) {
      return reply.code(404).send(createResponse.error('Quote not found', 404))
    }

    const relatedQuotes = await prisma.quote.findMany({
      where: {
        author: originalQuote.author,
        id: { not: quoteId }
      },
      select: { id: true, content: true },
      take: 10,
      orderBy: { id: 'asc' }
    })

    return reply.code(200).send(createResponse.success({
      originalQuote,
      relatedQuotes
    }, 'Related quotes retrieved successfully'))

  } catch (error: any) {
    req.log.error('Failed to get related quotes:', error)
    return reply.code(500).send(createResponse.error('Internal server error', 500, error.message))
  }
}
