import { FastifyReply, FastifyRequest } from 'fastify'
import { FastifyJWT } from '@fastify/jwt'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
	try {
		const authorization = req.headers.authorization

		if (!authorization) {
			return reply.status(401).send({ message: 'Authorization header required' })
		}

		if (!authorization.startsWith('Bearer ')) {
			return reply.status(401).send({ message: 'Invalid authorization format. Use: Bearer <token>' })
		}

		const token = authorization.slice(7)

		if (!token) {
			return reply.status(401).send({ message: 'Token required' })
		}

		const decoded = req.jwt.verify<FastifyJWT['user']>(token)
		req.user = decoded
	} catch (error) {
		return reply.status(401).send({ message: 'Invalid or expired token' })
	}
}
