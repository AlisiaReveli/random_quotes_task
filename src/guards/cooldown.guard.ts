import { FastifyRequest, FastifyReply } from 'fastify'
import { CooldownService } from '../services/cooldown.service'

export async function checkGuessCooldown(req: FastifyRequest, reply: FastifyReply) {
	try {
		const userId = Number((req.user as any)?.id)
		const cooldownResult = await CooldownService.checkGuessCooldown(userId)
		
		if (!cooldownResult.allowed) {
			if (cooldownResult.message === 'Invalid user') {
				return reply.code(401).send({ message: cooldownResult.message })
			}
			
			if (cooldownResult.message === 'Internal server error') {
				return reply.code(500).send({ message: cooldownResult.message })
			}
			
			// Cooldown active - return the specific cooldown response format
			return reply.code(429).send({
				correct: false,
				message: cooldownResult.message
			})
		}
	} catch (error) {
		return reply.code(500).send({ message: 'Internal server error' })
	}
}