import { FastifyInstance } from 'fastify'
import { guessAuthor, getNextQuote } from './quote.controller'
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
  app.log.info('Quotes routes registered')
}
