import { FastifyInstance } from 'fastify'
import { guessAuthor, getNextQuote, getRelatedQuotes } from './quote.controller'
import { quoteRouteSchemas } from '../../docs/quote.route.schema'

export async function quoteRoutes(app: FastifyInstance) {
  app.post(
    '/guess',
    {
      preHandler: [app.authenticate, app.checkGuessCooldown],
      schema: quoteRouteSchemas.guessAuthor
    },
    guessAuthor
  )
  app.get(
    '/next', {
    preHandler: [app.authenticate],
    schema: quoteRouteSchemas.getNextQuote
  },
    getNextQuote
  )
  app.get(
    '/related/:quoteId',
    {
      preHandler: [app.authenticate],
      schema: quoteRouteSchemas.getRelatedQuotes
    },
    getRelatedQuotes
  )
  app.log.info('Quotes routes registered')
}
