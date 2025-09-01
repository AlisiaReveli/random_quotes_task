import { jest } from '@jest/globals'

// Mock dependencies
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('../../utils/logger', () => ({
  userLog: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

import bcrypt from 'bcrypt'
import { createUser, login, getTopUsers } from '../../modules/user/user.controller'
import { createMockRequest, createMockReply, mockUser } from '../utils/test-helpers'
import prisma from '../../utils/prisma'
import { userLog } from '../../utils/logger'

describe('User Controller', () => {
  let mockRequest: any
  let mockReply: any

  beforeEach(() => {
    mockRequest = createMockRequest()
    mockReply = createMockReply()
    jest.clearAllMocks()
  })

  describe('createUser', () => {
    const mockCreateUserInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    }

    beforeEach(() => {
      mockRequest.body = mockCreateUserInput
    })

    it('should create a user successfully', async () => {
      const hashedPassword = 'hashedpassword123'
      const createdUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        score: 0,
        right_guessed_authors: {},
        email_sent: false,
        created_at: new Date(),
        updated_at: new Date(),
      }

      ;(prisma.user.findUnique as any).mockResolvedValue(null)
      ;(bcrypt.hash as any).mockResolvedValue(hashedPassword)
      ;(prisma.user.create as any).mockResolvedValue(createdUser)

      await createUser(mockRequest, mockReply)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          password: hashedPassword,
          email: 'test@example.com',
          name: 'Test User',
          right_guessed_authors: {},
        },
      })
      expect(userLog.info).toHaveBeenCalledWith(
        { user: { id: 1, email: 'test@example.com', name: 'Test User', score: 0, right_guessed_authors: {}, email_sent: false, created_at: expect.any(Date), updated_at: expect.any(Date) } },
        'User created successfully'
      )
      expect(mockReply.code).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User created successfully',
          data: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            score: 0,
            right_guessed_authors: {},
            email_sent: false,
            created_at: expect.any(Date),
            updated_at: expect.any(Date),
          },
        })
      )
    })

    it('should return 401 when user already exists', async () => {
      ;(prisma.user.findUnique as any).mockResolvedValue(mockUser)

      await createUser(mockRequest, mockReply)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.hash).not.toHaveBeenCalled()
      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User already exists with this email',
        })
      )
    })

    it('should handle database error during user creation', async () => {
      const hashedPassword = 'hashedpassword123'
      const dbError = new Error('Database connection failed')

      ;(prisma.user.findUnique as any).mockResolvedValue(null)
      ;(bcrypt.hash as any).mockResolvedValue(hashedPassword)
      ;(prisma.user.create as any).mockRejectedValue(dbError)

      await createUser(mockRequest, mockReply)

      expect(userLog.error).toHaveBeenCalledWith('Failed to create user', dbError)
      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to create user',
        })
      )
    })
  })

  describe('login', () => {
    const mockLoginInput = {
      email: 'test@example.com',
      password: 'password123',
    }

    beforeEach(() => {
      mockRequest.body = mockLoginInput
    })

    it('should login user successfully', async () => {
      const userWithPassword = {
        ...mockUser,
        password: 'hashedpassword123',
      }

      ;(prisma.user.findUnique as any).mockResolvedValue(userWithPassword)
      ;(bcrypt.compare as any).mockResolvedValue(true)

      await login(mockRequest, mockReply)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword123')
      expect(mockRequest.jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
        { expiresIn: process.env.JWT_EXPIRATION }
      )
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: {
            accessToken: 'mock-jwt-token',
            user: {
              id: 1,
              email: 'test@example.com',
              name: 'Test User',
              score: 0,
            },
          },
        })
      )
    })

    it('should return 401 when user is not found', async () => {
      ;(prisma.user.findUnique as any).mockResolvedValue(null)

      await login(mockRequest, mockReply)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'This email is not registered',
        })
      )
    })

    it('should return 401 when password is incorrect', async () => {
      const userWithPassword = {
        ...mockUser,
        password: 'hashedpassword123',
      }

      ;(prisma.user.findUnique as any).mockResolvedValue(userWithPassword)
      ;(bcrypt.compare as any).mockResolvedValue(false)

      await login(mockRequest, mockReply)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword123')
      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email or password',
        })
      )
    })
  })

  describe('getTopUsers', () => {
    it('should return top users with default limit of 10', async () => {
      const mockTopUsers = [
        { id: 1, name: 'User 1', email: 'user1@example.com', score: 100 },
        { id: 2, name: 'User 2', email: 'user2@example.com', score: 90 },
      ]
      const totalUsers = 2

      mockRequest.query = {}
      ;(prisma.user.findMany as any).mockResolvedValue(mockTopUsers)
      ;(prisma.user.count as any).mockResolvedValue(totalUsers)

      await getTopUsers(mockRequest, mockReply)

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          score: true,
        },
        orderBy: {
          score: 'desc',
        },
        take: 10,
      })
      expect(prisma.user.count).toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Top users retrieved successfully',
          data: {
            users: mockTopUsers,
            total: totalUsers,
          },
        })
      )
    })

    it('should return top users with custom limit', async () => {
      const mockTopUsers = [
        { id: 1, name: 'User 1', email: 'user1@example.com', score: 100 },
      ]
      const totalUsers = 5

      mockRequest.query = { limit: '5' }
      ;(prisma.user.findMany as any).mockResolvedValue(mockTopUsers)
      ;(prisma.user.count as any).mockResolvedValue(totalUsers)

      await getTopUsers(mockRequest, mockReply)

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          score: true,
        },
        orderBy: {
          score: 'desc',
        },
        take: 5,
      })
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Top users retrieved successfully',
          data: {
            users: mockTopUsers,
            total: totalUsers,
          },
        })
      )
    })

    it('should return 400 when limit is not a number', async () => {
      mockRequest.query = { limit: 'invalid' }

      await getTopUsers(mockRequest, mockReply)

      expect(prisma.user.findMany).not.toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Limit must be a number',
        })
      )
    })

    it('should handle database error', async () => {
      const dbError = new Error('Database connection failed')

      mockRequest.query = {}
      ;(prisma.user.findMany as any).mockRejectedValue(dbError)

      await getTopUsers(mockRequest, mockReply)

      expect(mockRequest.log.error).toHaveBeenCalledWith('Failed to get top users:', dbError)
      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
        })
      )
    })

    it('should handle empty users list', async () => {
      const mockTopUsers: any[] = []
      const totalUsers = 0

      mockRequest.query = {}
      ;(prisma.user.findMany as any).mockResolvedValue(mockTopUsers)
      ;(prisma.user.count as any).mockResolvedValue(totalUsers)

      await getTopUsers(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Top users retrieved successfully',
          data: {
            users: [],
            total: 0,
          },
        })
      )
    })
  })
})
