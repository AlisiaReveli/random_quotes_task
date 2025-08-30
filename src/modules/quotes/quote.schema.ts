import { z } from 'zod'
import { buildJsonSchemas } from 'fastify-zod'

const quoteQuerySchema = z.object({
    limit: z.preprocess(
      (val) => val ? parseInt(val as string, 1) : 1,
      z.number().min(1).max(1).default(1)
    )
  })

export type QuoteInput = z.infer<typeof quoteQuerySchema>

export const { schemas: quoteSchemas, $ref } = buildJsonSchemas({
  quoteQuerySchema,
}, {
    $id: 'QuoteSchemas' 
  })