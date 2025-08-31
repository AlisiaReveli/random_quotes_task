import { z } from 'zod'
import { buildJsonSchemas } from 'fastify-zod'

const createUserSchema = z.object({
  email: z.string(),
  password: z.string().min(6),
  name: z.string(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

const createUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
})

const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email(),
  password: z.string().min(6),
})
export type LoginUserInput = z.infer<typeof loginSchema>

const loginResponseSchema = z.object({
  accessToken: z.string(),
})

const topUsersQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 10
    const parsed = parseInt(val, 10)
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
      throw new Error("limit must be a positive integer between 1 and 100")
    }
    return parsed
  })
})

const topUserSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string(),
  score: z.number()
})

const topUsersResponseSchema = z.object({
  users: z.array(topUserSchema),
  total: z.number()
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
