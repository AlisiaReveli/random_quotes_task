import { $ref } from '../modules/user/user.schema'

export const userRouteSchemas = {
  getUsers: {
    description: 'Get all users (requires authentication)',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    name: { type: 'string', nullable: true },
                    email: { type: 'string' },
                    score: { type: 'number' }
                  }
                }
              }
            }
          },
          timestamp: { type: 'string' }
        }
      }
    }
  },

  registerUser: {
    description: 'Register a new user',
    tags: ['Users'],
    body: $ref('createUserSchema'),
    response: {
      201: $ref('createUserResponseSchema'),
    },
  },

  loginUser: {
    description: 'Login user and get access token',
    tags: ['Users'],
    body: $ref('loginSchema'),
    response: {
      201: $ref('loginResponseSchema'),
    },
  },

  getTopUsers: {
    description: 'Get top users by score',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    querystring: $ref('topUsersQuerySchema'),
    response: { 200: $ref('topUsersResponseSchema') }
  }
}
