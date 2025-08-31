import { FastifyInstance } from 'fastify'
import { createUser, getTopUsers, login } from './user.controller'
import { userRouteSchemas } from '../../docs/user.route.schema'
import { topUsersQuerySchema } from './user.schema'

export async function userRoutes(app: FastifyInstance) {
	app.post(
		'/register',
		{
			schema: userRouteSchemas.registerUser
		},
		createUser
	)
	app.post(
		'/login',
		{
			schema: userRouteSchemas.loginUser
		},
		login
	)
	app.get(
		'/top',
		{
		  preHandler: [app.authenticate],
		  schema: userRouteSchemas.getTopUsers
		},
		getTopUsers
	  )
	app.log.info('user routes registered')
}
