import { jest } from '@jest/globals'
import { execute, parse } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from '../graphql/schema'
import { resolvers } from '../graphql/resolvers'

// Mock the controller functions
jest.mock('../modules/user/user.controller', () => ({
  createUser: jest.fn(),
  login: jest.fn(),
  getTopUsers: jest.fn(),
}))

jest.mock('../modules/quotes/quote.controller', () => ({
  getNextQuote: jest.fn(),
  guessAuthor: jest.fn(),
  getRelatedQuotes: jest.fn(),
}))

jest.mock('../guards/auth.guard', () => ({
  authenticate: jest.fn(),
}))

jest.mock('../services/cooldown.service', () => ({
  CooldownService: {
    checkGuessCooldown: jest.fn(),
  }
}))

import { createUser, login, getTopUsers } from '../modules/user/user.controller'
import { getNextQuote, guessAuthor, getRelatedQuotes } from '../modules/quotes/quote.controller'
import { CooldownService } from '../services/cooldown.service'

// Type the mocked functions
const mockCreateUser = createUser as any
const mockLogin = login as any
const mockGetTopUsers = getTopUsers as any
const mockGetNextQuote = getNextQuote as any
const mockGuessAuthor = guessAuthor as any
const mockGetRelatedQuotes = getRelatedQuotes as any
const mockCheckGuessCooldown = CooldownService.checkGuessCooldown as any

describe('GraphQL API', () => {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  })
  
  const mockContext = {
    req: {
      body: {},
      query: {},
      params: {},
      user: { id: 1, email: 'test@example.com' },
      jwt: { sign: jest.fn() },
      server: { syncQuotes: jest.fn() },
      log: { info: jest.fn(), error: jest.fn() },
    },
    reply: {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    },
    user: { id: 1, email: 'test@example.com' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default cooldown service to allow guesses
    mockCheckGuessCooldown.mockResolvedValue({ allowed: true })
  })

  describe('User Mutations', () => {
    it('should test basic GraphQL execution', async () => {
      const result = await execute({
        schema,
        document: parse(`
          query {
            __schema {
              types {
                name
              }
            }
          }
        `),
        contextValue: mockContext
      })
      
      expect(result.errors).toBeUndefined()
      expect(result.data).toBeDefined()
    })

    it('should register a new user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        score: 0,
        rightGuessedAuthors: {},
        emailSent: false,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }

      mockCreateUser.mockResolvedValue({
        success: true,
        data: mockUser,
        message: 'User created successfully',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const mutation = `
        mutation RegisterUser($input: CreateUserInput!) {
          register(input: $input) {
            id
            email
            name
            score
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.register).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        score: 0
      })
    })

    it('should return proper error when trying to register with existing email', async () => {
      mockCreateUser.mockResolvedValue({
        success: false,
        message: 'User already exists with this email',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const mutation = `
        mutation RegisterUser($input: CreateUserInput!) {
          register(input: $input) {
            id
            email
            name
            score
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            email: 'existing@example.com',
            password: 'password123',
            name: 'Test User'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toBe('User already exists with this email')
      expect(result.data).toBeNull()
    })

    it('should login a user', async () => {
      const mockAuthPayload = {
        accessToken: 'jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          score: 0
        }
      }

      mockLogin.mockResolvedValue({
        success: true,
        data: mockAuthPayload,
        message: 'Login successful',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const mutation = `
        mutation LoginUser($input: LoginUserInput!) {
          login(input: $input) {
            accessToken
            user {
              id
              email
              name
              score
            }
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            email: 'test@example.com',
            password: 'password123'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.login).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          score: 0
        }
      })
    })

    it('should return proper error when login fails', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: 'Invalid email or password',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const mutation = `
        mutation LoginUser($input: LoginUserInput!) {
          login(input: $input) {
            accessToken
            user {
              id
              email
              name
              score
            }
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            email: 'wrong@example.com',
            password: 'wrongpassword'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toBe('Invalid email or password')
      expect(result.data).toBeNull()
    })
  })

  describe('Quote Queries', () => {
    it('should get next quote', async () => {
      const mockQuote = {
        id: '1',
        content: 'Test quote content',
        author: 'Test Author',
        guessedCorrect: 5,
        guessedFalse: 2,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }

      mockGetNextQuote.mockResolvedValue({
        success: true,
        data: { quote: mockQuote },
        message: 'Quote retrieved successfully',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const query = `
        query GetNextQuote {
          nextQuote(prioritize: wrong) {
            id
            content
            author
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(query),
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.nextQuote).toEqual({
        id: '1',
        content: 'Test quote content',
        author: 'Test Author'
      })
    })

    it('should return authentication error when user is not authenticated', async () => {
      const contextWithoutUser = {
        ...mockContext,
        user: undefined
      }

      const query = `
        query GetNextQuote {
          nextQuote(prioritize: wrong) {
            id
            content
            author
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(query),
        contextValue: contextWithoutUser,
        rootValue: resolvers
      })

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toBe('Authentication required. Please provide a valid Bearer token.')
      expect(result.data).toBeNull()
    })

    it('should get top users', async () => {
      const mockTopUsers = {
        users: [
          {
            id: '1',
            email: 'user1@example.com',
            name: 'User 1',
            score: 100,
            rightGuessedAuthors: {},
            emailSent: false,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          }
        ],
        total: 1
      }

      mockGetTopUsers.mockResolvedValue({
        success: true,
        data: mockTopUsers,
        message: 'Top users retrieved successfully',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const query = `
        query GetTopUsers {
          topUsers(limit: 5) {
            users {
              id
              name
              email
              score
            }
            total
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(query),
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.topUsers).toEqual({
        users: [
          {
            id: '1',
            name: 'User 1',
            email: 'user1@example.com',
            score: 100
          }
        ],
        total: 1
      })
    })
  })

  describe('Quote Mutations', () => {
    it('should handle cooldown when user already tried guessing', async () => {
      // Mock cooldown service to return cooldown active
      mockCheckGuessCooldown.mockResolvedValue({
        allowed: false,
        message: 'You already tried guessing. Try again after 12 hours.'
      })

      const mutation = `
        mutation GuessAuthor($input: GuessInput!) {
          guessAuthor(input: $input) {
            correct
            newScore
            message
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            quoteId: 1,
            authorGuess: 'Test Author'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.guessAuthor).toEqual({
        correct: false,
        newScore: null,
        message: 'You already tried guessing. Try again after 12 hours.'
      })
    })

    it('should guess author', async () => {
      const mockGuessResult = {
        correct: true,
        newScore: 1,
        message: 'Correct answer'
      }

      mockGuessAuthor.mockResolvedValue({
        success: true,
        data: mockGuessResult,
        message: 'Correct answer',
        timestamp: '2023-01-01T00:00:00Z'
      })

      const mutation = `
        mutation GuessAuthor($input: GuessInput!) {
          guessAuthor(input: $input) {
            correct
            newScore
            message
          }
        }
      `

      const result = await execute({
        schema,
        document: parse(mutation),
        variableValues: {
          input: {
            quoteId: 1,
            authorGuess: 'Test Author'
          }
        },
        contextValue: mockContext
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.guessAuthor).toEqual({
        correct: true,
        newScore: 1,
        message: 'Correct answer'
      })
    })
  })
})
