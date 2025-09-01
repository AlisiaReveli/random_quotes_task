import { $ref } from '../modules/quotes/quote.schema'

export const quoteRouteSchemas = {
  guessAuthor: {
    description: 'Guess the author of a quote',
    tags: ['Quotes'],
    security: [{ bearerAuth: [] }],
    body: $ref('guessBodySchema'),
    response: { 200: $ref('guessResponseSchema') }
  },

  getNextQuote: {
    description: 'Get the next quote for the user to guess',
    tags: ['Quotes'],
    security: [{ bearerAuth: [] }],
    querystring: $ref('nextQuoteQuerySchema'),
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              quote: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  content: { type: 'string' }
                }
              }
            }
          },
          timestamp: { type: 'string' }
        }
      }
    }
  },

  getRelatedQuotes: {
    description: 'Get quotes related to a specific quote',
    tags: ['Quotes'],
    security: [{ bearerAuth: [] }],
    params: $ref('relatedQuotesParamsSchema'),
    response: { 200: $ref('relatedQuotesResponseSchema') }
  }
}