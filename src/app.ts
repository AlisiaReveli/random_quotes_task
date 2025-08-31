import 'dotenv/config'
import Fastify, { FastifyInstance } from 'fastify'
import { userRoutes } from './modules/user/user.route'
import fjwt from '@fastify/jwt'
import { userSchemas } from './modules/user/user.schema'
import { authenticate } from './guards/auth.guard'
import { quoteRoutes } from './modules/quotes/quote.route'
import { quoteSchemas } from './modules/quotes/quote.schema'
import { SchedulerService } from './jobs/scheduler.service'
import { checkGuessCooldown } from './guards/cooldown.guard'
import { log } from './utils/logger'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { setupGraphQL } from './graphql/server'

const app = Fastify({ logger: true })
app.get('/healthcheck', (req, res) => {
	log.info('Health check requested')
	res.send({ message: 'Success' })
})

for (let schema of [...userSchemas, ...quoteSchemas]) app.addSchema(schema)

app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Random Quotes API',
      description: 'API for a quotes guessing game where users can guess authors of famous quotes',
      version: '1.0.0',
      contact: {
        name: 'Alisia Reveli',
        email: 'alisjarevel@gmail.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'Users',
        description: 'User management and authentication'
      },
      {
        name: 'Quotes',
        description: 'Quote operations and guessing game'
      }
    ]
  }
})

// Swagger UI configuration
app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
  transformSpecificationClone: true
})

log.info('Swagger UI registered, accessible at http://localhost:3000/docs')
app.register(fjwt, { secret: process.env.SECRET! })

app.addHook('preHandler', (req, res, next) => {
	req.jwt = app.jwt
	return next()
})

let schedulerService: SchedulerService

app.decorate('authenticate', authenticate)
app.decorate('checkGuessCooldown', checkGuessCooldown)
app.decorate('syncQuotes', async function (this: FastifyInstance) {
	if (schedulerService) return await schedulerService.syncNow()
	return { processedCount: 0, createdCount: 0 }
})
// routes
app.register(userRoutes, { prefix: 'api/users' })
app.register(quoteRoutes, { prefix: 'api/quotes' })
// graceful shutdown
const listeners = ['SIGINT', 'SIGTERM']
listeners.forEach((signal) => {
	process.on(signal, async () => {
		await app.close()
		process.exit(0)
	})
})

async function main() {
	try {
		log.info('Starting application')
		schedulerService = new SchedulerService()
		log.info('Scheduler service started')
		
		await setupGraphQL(app)
		log.info('GraphQL server setup complete')
		
		await app.listen({
			port: parseInt(process.env.PORT!),
			host: '0.0.0.0',
		})
	} catch (error) {
		log.error('Application failed to start', error)
		process.exit(1)
	}
	log.info('Application started successfully')

}

main()