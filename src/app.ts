import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { userRoutes } from './modules/user/user.route'
import fjwt, { FastifyJWT } from '@fastify/jwt'
import { userSchemas } from './modules/user/user.schema'
import { authenticate } from './guards/auth.guard'
import { quoteRoutes } from './modules/quotes/quote.route'
import { quoteSchemas } from './modules/quotes/quote.schema'
import { SchedulerService } from './jobs/scheduler.service'


const app = Fastify({ logger: true })

app.get('/healthcheck', (req, res) => {
	res.send({ message: 'Success' })
})

for (let schema of [...userSchemas, ...quoteSchemas]) app.addSchema(schema)

app.register(fjwt, { secret: process.env.SECRET! })

app.addHook('preHandler', (req, res, next) => {
	req.jwt = app.jwt
	return next()
})

app.decorate('authenticate', authenticate)

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

let schedulerService: SchedulerService

async function main() {
	schedulerService = new SchedulerService()
	console.log('Scheduler service started')

	await app.listen({
		port: parseInt(process.env.PORT!),
		host: '0.0.0.0',
	})
}

main()