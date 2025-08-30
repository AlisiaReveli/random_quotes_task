import { z } from 'zod'
import { buildJsonSchemas } from 'fastify-zod'

const quoteQuerySchema = z.object({
    limit: z.preprocess(
      (val) => val ? parseInt(val as string, 1) : 1,
      z.number().min(1).max(1).default(1)
    )
  })

export type QuoteInput = z.infer<typeof quoteQuerySchema>

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


export const { schemas: quoteSchemas, $ref } = buildJsonSchemas({
  quoteQuerySchema,
  guessBodySchema,
  guessResponseSchema,
}, {
    $id: 'QuoteSchemas' 
  })