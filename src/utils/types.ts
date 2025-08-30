import { JWT } from '@fastify/jwt'

declare module 'fastify' {
	interface FastifyRequest {
		jwt: JWT
	}
	export interface FastifyInstance {
		authenticate: any
		checkGuessCooldown: any
		syncQuotes: () => Promise<{ processedCount: number; createdCount: number; }>
	}
}

type UserPayload = {
	id: string
	email: string
	name: string
}
declare module '@fastify/jwt' {
	interface FastifyJWT {
		user: UserPayload
	}
}

export type SyncResult = { processedCount: number; createdCount: number }
