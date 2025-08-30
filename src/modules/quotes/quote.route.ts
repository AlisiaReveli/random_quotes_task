import { FastifyInstance } from 'fastify'
import { getQuotes, guessAuthor } from './quote.controller'
import { $ref } from './quote.schema'

export async function quoteRoutes(app: FastifyInstance) {
    app.get(
      '/',
      {
        preHandler: [app.authenticate],
        schema: {
          querystring: $ref('quoteQuerySchema'), 
        }
      },
      getQuotes
    )
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
    app.log.info('Quotes routes registered')
  }
