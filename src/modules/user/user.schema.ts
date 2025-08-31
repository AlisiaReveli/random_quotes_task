import { z } from 'zod'
import { buildJsonSchemas } from 'fastify-zod'

const createUserSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(6).describe('User password (minimum 6 characters)'),
  name: z.string().describe('User full name'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

const createUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  timestamp: z.string(),
})

const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email()
    .describe('User email address'),
  password: z.string().min(6).describe('User password'),
})
export type LoginUserInput = z.infer<typeof loginSchema>

const loginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.number(),
      email: z.string(),
      name: z.string(),
    })
  }),
  timestamp: z.string(),
})

const topUsersQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(10)
})

const topUserSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string(),
  score: z.number()
})

const topUsersResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    users: z.array(topUserSchema),
    total: z.number()
  }),
  timestamp: z.string(),
})

export type TopUsersQuery = z.infer<typeof topUsersQuerySchema>

export const { schemas: userSchemas, $ref } = buildJsonSchemas({
  createUserSchema,
  createUserResponseSchema,
  loginSchema,
  loginResponseSchema,
  topUsersQuerySchema,
  topUsersResponseSchema,
  topUserSchema,
})
export { topUsersQuerySchema }