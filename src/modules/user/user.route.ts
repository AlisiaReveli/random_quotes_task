import { FastifyInstance } from 'fastify'
import { createUser, getTopUsers, getUsers, login } from './user.controller'
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
	app.get(
		'/top',
		{
		  preHandler: [app.authenticate],
		  schema: {
			querystring: $ref('topUsersQuerySchema'),
			response: { 200: $ref('topUsersResponseSchema') }
		  }
		},
		getTopUsers
	  )
	app.log.info('user routes registered')
}
