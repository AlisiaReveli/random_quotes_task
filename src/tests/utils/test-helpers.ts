import { FastifyRequest, FastifyReply } from 'fastify'
import { createResponse } from '../../utils/response'

// Mock user for testing
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  score: 0,
  right_guessed_authors: {},
  email_sent: false,
  created_at: new Date(),
  updated_at: new Date()
}

// Mock quote for testing
export const mockQuote = {
  id: 1,
  content: 'Test quote content',
  author: 'Test Author',
  guessed_correct: 0,
  guessed_false: 0,
  created_at: new Date(),
  updated_at: new Date()
}

// Mock request object
export const createMockRequest = (overrides: Partial<FastifyRequest> = {}): Partial<FastifyRequest> => ({
  user: { id: 1, email: 'test@example.com', name: 'Test User' },
  body: {},
  query: {},
  params: {},
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  server: {
    syncQuotes: jest.fn().mockResolvedValue({ createdCount: 0 })
  },
  jwt: {
    sign: jest.fn().mockReturnValue('mock-jwt-token')
  },
  ...overrides
})

// Mock reply object
export const createMockReply = (): Partial<FastifyReply> => {
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis()
  }
  return reply
}

// Helper to create success response
export const createSuccessResponse = (data: any, message?: string) => 
  createResponse.success(data, message)

// Helper to create error response
export const createErrorResponse = (message: string, statusCode = 500, error?: string) =>
  createResponse.error(message, statusCode, error)
