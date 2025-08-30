import { FastifyInstance } from 'fastify'
import { getQuotes } from './quote.controller'
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
    app.log.info('Quotes routes registered')
  }
