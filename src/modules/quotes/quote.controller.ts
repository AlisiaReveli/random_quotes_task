import { FastifyReply, FastifyRequest } from 'fastify'
import axios from 'axios'
import { QuoteInput, GuessInput } from './quote.schema'
import prisma from '../../utils/prisma'
import redis from '../../utils/redis'
import { COOLDOWN_SECONDS, normalize } from '../../utils/common_methods'

interface Quote {
  id: string
  content: string
  author: string
  tags?: string[]
  length?: number
}

interface QuotesResponse {
  quotes: Quote[]
  total: number
  skip: number
  limit: number
}

export async function getQuotes(req: FastifyRequest<{
  Querystring: QuoteInput
}>, reply: FastifyReply) {
  try {
    const { limit } = req.query;

    const response = await axios.get<QuotesResponse>(
      `https://dummyjson.com/quotes?limit=${limit}`,
      { timeout: 5000 }
    )

    console.log(response.data)
    const quotesData = response.data

    return reply.code(200).send({
      success: true,
      data: quotesData
    })

  } catch (error: any) {
    req.log.error('Failed to fetch quotes:', error)

    return reply.code(500).send({
      success: false,
      error: error.message || 'Unknown error'
    })
  }
}



export async function guessAuthor(
  req: FastifyRequest<{ Body: GuessInput }>,
  reply: FastifyReply
) {
  try {
    const { quoteId, authorGuess } = req.body

    const userId = Number(req.user?.id)
    if (!Number.isFinite(userId)) {
      return reply.code(401).send({ message: 'Invalid user' })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, author: true },
    })
    if (!quote) {
      return reply.code(404).send({ message: 'Quote not found' })
    }

    const isCorrect = normalize(quote.author) === normalize(authorGuess)

    if (isCorrect) {
      const updatedUser = await prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { right_guessed_authors: true },
        })

        const stats = (current?.right_guessed_authors as Record<string, number> | null) || {}
        const author = quote.author
        stats[author] = (stats[author] || 0) + 1

        const user = await tx.user.update({
          where: { id: userId },
          data: {
            score: { increment: 1 },
            right_guessed_authors: stats,
          },
          select: { score: true },
        })

        await tx.quote.update({
          where: { id: quoteId },
          data: { guessed_correct: { increment: 1 } },
          select: { id: true },
        })

        return user
      })

      return reply.code(200).send({
        correct: true,
        message: 'Correct answer',
        newScore: updatedUser.score,
      })
    }

    await prisma.quote.update({
      where: { id: quoteId },
      data: { guessed_false: { increment: 1 } },
      select: { id: true },
    })
    await redis.set(`${userId}:failed_attempt`, new Date().toISOString(), { EX: COOLDOWN_SECONDS })

    return reply.code(200).send({
      correct: false,
      message: 'Wrong answer, try again tomorrow',
    })
  } catch (e: any) {
    req.log.error('Failed to process guess:', e)
    return reply.code(500).send({ message: e.message || 'Unknown error' })
  }
}