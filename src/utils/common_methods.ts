import { FastifyRequest, FastifyReply } from "fastify"
import prisma from "./prisma"
import { createResponse } from "./response"

export const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_TIME) || 60 * 60 * 12
export const normalize = (s: string) => s.trim().toLowerCase()

export const notFoundUserCheck = async (req: FastifyRequest, reply: FastifyReply) => {
	const userId = Number(req.user?.id)
	if (!Number.isFinite(userId)) return reply.code(401).send(createResponse.error('Invalid id', 401))
        const exists = await prisma.user.findUnique({ where: { id: userId } })
	if (!exists) return reply.code(404).send(createResponse.error('User not found', 404))
}

export const validateQuote = async (quoteId: number) => {
	const quote = await prisma.quote.findUnique({
	  where: { id: quoteId },
	  select: { id: true, author: true },
	})
	
	if (!quote) {
	  throw new Error('Quote not found')
	}
	
	return quote
  }

 export const isGuessCorrect = (actualAuthor: string, guessedAuthor: string): boolean => {
	return normalize(actualAuthor) === normalize(guessedAuthor)
  }