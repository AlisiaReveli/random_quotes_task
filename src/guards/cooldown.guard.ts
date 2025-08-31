import { FastifyRequest, FastifyReply } from 'fastify'
import  { redisUtils } from '../utils/redis'
export async function checkGuessCooldown(req: FastifyRequest, reply: FastifyReply) {
	try {
		const userId = Number((req.user as any)?.id)
		if (!Number.isFinite(userId)) {
			return reply.code(401).send({ message: 'Invalid user' })
		}
		const attemptKey = `${userId}:failed_attempt`
		const existingAttempt =  await redisUtils.get(attemptKey);
		if (existingAttempt) {
			return reply.code(429).send({
				correct: false,
				message: 'You already tried guessing. Try again after 12 hours.'
			})
		}
	} catch (error) {
		return reply.code(500).send({ message: 'Internal server error' })
	}
}