import { FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from '../guards/auth.guard'

export interface GraphQLContext {
  req: FastifyRequest
  reply: FastifyReply
  user?: any
}

export async function createGraphQLContext(req: FastifyRequest, reply: FastifyReply): Promise<GraphQLContext> {
  try {
    const authorization = req.headers.authorization
    if (authorization && authorization.startsWith('Bearer ')) {
      const mockReply = {
        ...reply,
        code: (statusCode: number) => mockReply,
        send: (data: any) => mockReply,
        status: (statusCode: number) => mockReply
      }
      
      const authReq = {
        ...req,
        headers: { ...req.headers, authorization }
      } as FastifyRequest
      
      await authenticate(authReq, mockReply as any)
      
      // Check if authentication was successful by verifying user is set
      if (authReq.user && authReq.user.id) {
        return {
          req,
          reply,
          user: authReq.user
        }
      }
    }
  } catch (error: any) {
    console.log('GraphQL auth error:', error.message)
  }

  return {
    req,
    reply
  }
}
