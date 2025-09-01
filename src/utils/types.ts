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

export type AuthorStats = {
	count: number
	email_sent: boolean
  }
  
export type GuessTxResult = {
	user: { score: number }
	newCount: number
	email: string | null
	author: string
	email_sent_for_author: boolean,
	authorStats: Record<string, AuthorStats>
  }