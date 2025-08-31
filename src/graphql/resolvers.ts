import { GraphQLScalarType, Kind } from 'graphql'
import { createUser, login, getTopUsers } from '../modules/user/user.controller'
import { getNextQuote, guessAuthor, getRelatedQuotes } from '../modules/quotes/quote.controller'
import { FastifyRequest, FastifyReply } from 'fastify'
import { CooldownService } from '../services/cooldown.service'

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value) {
    return value
  },
  parseValue(value) {
    return value
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value)
    }
    return null
  },
})

const createMockRequest = (originalReq: FastifyRequest, overrides: any = {}) => {
  return {
    ...originalReq,
    body: overrides.body || {},
    query: overrides.query || {},
    params: overrides.params || {},
    user: overrides.user || originalReq.user,
    jwt: originalReq.jwt,
    server: originalReq.server,
    log: originalReq.log,
  } as any
}

const createMockReply = (originalReply: FastifyReply) => {
  return {
    ...originalReply,
    code: (statusCode: number) => ({
      send: (data: any) => {
        originalReply.code(statusCode)
        return data
      }
    })
  } as any
}

export const resolvers = {
  JSON: JSONScalar,

  Query: {
    topUsers: async (parent: any, args: { limit?: number }, context: { req: FastifyRequest, reply: FastifyReply, user?: any }) => {
      // Check if user is authenticated
      if (!context.user || !context.user.id) {
        throw new Error('Authentication required. Please provide a valid Bearer token.')
      }
      
      const mockReq = createMockRequest(context.req, { 
        query: { limit: args.limit?.toString() },
        user: context.user
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await getTopUsers(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          return (result as any).data
        }
        
        // Extract error message from the response
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to get top users')
      } catch (error) {
        console.error('Get top users error:', error)
        throw error
      }
    },

    nextQuote: async (parent: any, args: { prioritize?: 'correct' | 'wrong' }, context: { req: FastifyRequest, reply: FastifyReply, user?: any }) => {
      // Check if user is authenticated
      if (!context.user || !context.user.id) {
        throw new Error('Authentication required. Please provide a valid Bearer token.')
      }
      
      const mockReq = createMockRequest(context.req, { 
        query: { prioritize: args.prioritize },
        user: context.user
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await getNextQuote(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          return (result as any).data.quote
        }
        
        // Extract error message from the response
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to get next quote')
      } catch (error) {
        console.error('Get next quote error:', error)
        throw error
      }
    },

    relatedQuotes: async (parent: any, args: { quoteId: number }, context: { req: FastifyRequest, reply: FastifyReply, user?: any }) => {
      // Check if user is authenticated
      if (!context.user || !context.user.id) {
        throw new Error('Authentication required. Please provide a valid Bearer token.')
      }
      
      const mockReq = createMockRequest(context.req, { 
        params: { quoteId: args.quoteId.toString() },
        user: context.user
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await getRelatedQuotes(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          return (result as any).data
        }
        
        // Extract error message from the response
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to get related quotes')
      } catch (error) {
        console.error('Get related quotes error:', error)
        throw error
      }
    },
  },

  Mutation: {
    register: async (parent: any, args: { input: { email: string, password: string, name?: string } }, context: { req: FastifyRequest, reply: FastifyReply }) => {
      const mockReq = createMockRequest(context.req, { 
        body: args.input 
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await createUser(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          return (result as any).data
        }
        
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to create user')
      } catch (error) {
        console.error('Register error:', error)
        throw error
      }
    },

    login: async (parent: any, args: { input: { email: string, password: string } }, context: { req: FastifyRequest, reply: FastifyReply }) => {
      const mockReq = createMockRequest(context.req, { 
        body: args.input 
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await login(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          return (result as any).data
        }
        
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to login')
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    guessAuthor: async (parent: any, args: { input: { quoteId: number, authorGuess: string } }, context: { req: FastifyRequest, reply: FastifyReply, user?: any }) => {
      // Check if user is authenticated
      if (!context.user || !context.user.id) {
        throw new Error('Authentication required. Please provide a valid Bearer token.')
      }
      
      // Check cooldown using shared service
      const userId = Number(context.user.id)
      const cooldownResult = await CooldownService.checkGuessCooldown(userId)
      
      if (!cooldownResult.allowed) {
        if (cooldownResult.message === 'Invalid user' || cooldownResult.message === 'Internal server error') {
          throw new Error(cooldownResult.message)
        }
        
        // Cooldown active - return the cooldown response
        return {
          correct: false,
          newScore: null,
          message: cooldownResult.message
        }
      }
      
      const mockReq = createMockRequest(context.req, { 
        body: args.input,
        user: context.user
      })
      const mockReply = createMockReply(context.reply)
      
      try {
        const result = await guessAuthor(mockReq, mockReply)
        
        if (result && typeof result === 'object' && 'data' in result && (result as any).success) {
          const typedResult = result as any
          return {
            correct: typedResult.data.correct,
            newScore: typedResult.data.newScore,
            message: typedResult.message || (typedResult.data.correct ? 'Correct answer' : 'Wrong answer, try again tomorrow')
          }
        }
        
        // Handle error response with message
        if (result && typeof result === 'object' && 'message' in result) {
          throw new Error((result as any).message)
        }
        
        throw new Error('Failed to process guess')
      } catch (error) {
        console.error('Guess author error:', error)
        throw error
      }
    },
  },
}
