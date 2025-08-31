import { FastifyInstance } from 'fastify'
import { guessAuthor, getNextQuote, getRelatedQuotes } from './quote.controller'
import { $ref } from './quote.schema'

export async function quoteRoutes(app: FastifyInstance) {
  app.post(
    '/guess',
    {
      preHandler: [app.authenticate, app.checkGuessCooldown],
      schema: {
        body: $ref('guessBodySchema'),
        response: { 200: $ref('guessResponseSchema') }
      }
    },
    guessAuthor
  )
  app.get(
    '/next', {
    preHandler: [app.authenticate],
    schema: { querystring: $ref('nextQuoteQuerySchema') },
  },
    getNextQuote
  )
  app.get(
    '/related/:quoteId',
    {
      preHandler: [app.authenticate],
      schema: {
        params: $ref('relatedQuotesParamsSchema'),
        response: { 200: $ref('relatedQuotesResponseSchema') }
      }
    },
    getRelatedQuotes
  )
  app.log.info('Quotes routes registered')
}
