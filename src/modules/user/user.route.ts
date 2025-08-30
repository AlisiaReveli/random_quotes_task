import { FastifyInstance } from 'fastify'
import { createUser, getUsers, login } from './user.controller'
import { $ref } from './user.schema'

export async function userRoutes(app: FastifyInstance) {
	app.get(
		'/',
		{
			preHandler: [app.authenticate],
		},
		getUsers
	)
	app.post(
		'/register',
		{
			schema: {
				body: $ref('createUserSchema'),
				response: {
					201: $ref('createUserResponseSchema'),
				},
			},
		},
		createUser
	)
	app.post(
		'/login',
		{
			schema: {
				body: $ref('loginSchema'),
				response: {
					201: $ref('loginResponseSchema'),
				},
			},
		},
		login
	)
	app.log.info('user routes registered')
}
