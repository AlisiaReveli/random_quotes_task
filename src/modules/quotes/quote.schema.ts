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
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    correct: z.boolean(),
    newScore: z.number().int().nonnegative().optional(),
  }),
  timestamp: z.string(),
})
export type GuessInput = z.infer<typeof guessBodySchema>

const nextQuoteQuerySchema = z.object({
  prioritize: z.nativeEnum(Prioritize).default(Prioritize.wrong),
})

export type NextQuoteQuery = z.infer<typeof nextQuoteQuerySchema>

const relatedQuotesParamsSchema = z.object({
  quoteId: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: "quoteId must be a positive integer"
  })
})

const relatedQuotesResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    originalQuote: z.object({
      id: z.number(),
      content: z.string(),
      author: z.string()
    }),
    relatedQuotes: z.array(z.object({
      id: z.number(),
      content: z.string(),
    }))
  }),
  timestamp: z.string(),
})

export type RelatedQuotesParams = z.infer<typeof relatedQuotesParamsSchema>

const mostGuessedQuotesQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 10
    const parsed = parseInt(val, 10)
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
      throw new Error("limit must be a positive integer between 1 and 100")
    }
    return parsed
  })
})


export const { schemas: quoteSchemas, $ref } = buildJsonSchemas({
  guessBodySchema,
  guessResponseSchema,
  nextQuoteQuerySchema,
  relatedQuotesParamsSchema,
  relatedQuotesResponseSchema,
}, {
    $id: 'QuoteSchemas' 
  })