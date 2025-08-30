import { z } from 'zod'
import { buildJsonSchemas } from 'fastify-zod'

export enum Prioritize {
  wrong = 'wrong',
  correct = 'correct',
}

const guessBodySchema = z.object({
  quoteId: z.number().int().min(1),
  authorGuess: z.string().min(1),
})

const guessResponseSchema = z.object({
  correct: z.boolean(),
  message: z.string(),
  newScore: z.number().int().nonnegative().optional(),
})

export type GuessInput = z.infer<typeof guessBodySchema>

const nextQuoteQuerySchema = z.object({
  prioritize: z.nativeEnum(Prioritize).default(Prioritize.wrong),
})

export type NextQuoteQuery = z.infer<typeof nextQuoteQuerySchema>


export const { schemas: quoteSchemas, $ref } = buildJsonSchemas({
  guessBodySchema,
  guessResponseSchema,
  nextQuoteQuerySchema,
}, {
    $id: 'QuoteSchemas' 
  })