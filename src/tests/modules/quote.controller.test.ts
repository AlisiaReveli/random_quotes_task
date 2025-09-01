import { jest } from '@jest/globals'

// Mock dependencies
jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  default: {
    quote: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userQuoteAttempt: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../utils/redis', () => ({
  redisUtils: {
    setWithExpiry: jest.fn(),
  },
}))

jest.mock('../../utils/email', () => ({
  sendDiscountEmail: jest.fn(),
}))

jest.mock('../../utils/logger', () => ({
  quotesLog: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('../../services/common.service', () => ({
  COOLDOWN_SECONDS: 43200,
  isGuessCorrect: jest.fn(),
  normalize: jest.fn((s: string) => s.trim().toLowerCase()),
  notFoundUserCheck: jest.fn(),
  validateQuote: jest.fn(),
}))

import { getNextQuote, guessAuthor, getRelatedQuotes } from '../../modules/quotes/quote.controller'
import { createMockRequest, createMockReply } from '../utils/test-helpers'
import { Prioritize } from '../../modules/quotes/quote.schema'
import prisma from '../../utils/prisma'
import { redisUtils } from '../../utils/redis'
import { sendDiscountEmail } from '../../utils/email'
import { quotesLog } from '../../utils/logger'
import { notFoundUserCheck, validateQuote, isGuessCorrect } from '../../services/common.service'

describe('Quote Controller', () => {
  let mockRequest: any
  let mockReply: any

  beforeEach(() => {
    mockRequest = createMockRequest()
    mockReply = createMockReply()
    jest.clearAllMocks()
  })

  describe('getNextQuote', () => {
    it('should return a quote successfully with default prioritize wrong', async () => {
      const mockQuotes = [
        { id: 1, content: 'Test quote 1' },
        { id: 2, content: 'Test quote 2' },
      ]

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(prisma.quote.count as any).mockResolvedValue(2)
      ;(prisma.quote.findMany as any).mockResolvedValue(mockQuotes)

      await getNextQuote(mockRequest, mockReply)

      expect(notFoundUserCheck).toHaveBeenCalledWith(mockRequest, mockReply)
      expect(prisma.quote.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { attempts: { none: { userId: 1 } } },
            { attempts: { some: { userId: 1, correct: false } } },
          ],
        },
      })
      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { attempts: { none: { userId: 1 } } },
            { attempts: { some: { userId: 1, correct: false } } },
          ],
        },
        orderBy: { guessed_false: 'desc' },
        take: 5,
        select: { id: true, content: true },
      })
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Quote retrieved successfully',
          data: { quote: expect.objectContaining({ id: expect.any(Number), content: expect.any(String) }) },
        })
      )
    })

    it('should return a quote with prioritize correct', async () => {
      const mockQuotes = [{ id: 1, content: 'Test quote 1' }]
      mockRequest.query = { prioritize: Prioritize.correct }

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(prisma.quote.count as any).mockResolvedValue(1)
      ;(prisma.quote.findMany as any).mockResolvedValue(mockQuotes)

      await getNextQuote(mockRequest, mockReply)

      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { attempts: { none: { userId: 1 } } },
            { attempts: { some: { userId: 1, correct: false } } },
          ],
        },
        orderBy: { guessed_correct: 'desc' },
        take: 5,
        select: { id: true, content: true },
      })
    })

    it('should sync quotes when no quotes are found and return 404 if still no quotes', async () => {
      const mockServer = {
        syncQuotes: jest.fn() as any,
      }
      ;(mockServer.syncQuotes as any).mockResolvedValue({ createdCount: 0 })
      mockRequest.server = mockServer

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(prisma.quote.count as any).mockResolvedValue(0)
      ;(prisma.quote.findMany as any).mockResolvedValue([])

      await getNextQuote(mockRequest, mockReply)

      expect(mockServer.syncQuotes).toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'We ran out of quotes, try again tomorrow',
        })
      )
    })

    it('should return quotes after syncing when new quotes are created', async () => {
      const mockQuotes = [{ id: 1, content: 'Test quote 1' }]
      const mockServer = {
        syncQuotes: jest.fn() as any,
      }
      ;(mockServer.syncQuotes as any).mockResolvedValue({ createdCount: 1 })
      mockRequest.server = mockServer

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(prisma.quote.count as any).mockResolvedValue(0)
      ;(prisma.quote.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockQuotes)

      await getNextQuote(mockRequest, mockReply)

      expect(mockServer.syncQuotes).toHaveBeenCalled()
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Quote retrieved successfully',
        })
      )
    })
  })

  describe('guessAuthor', () => {
    const mockGuessInput = {
      quoteId: 1,
      authorGuess: 'Test Author',
    }

    beforeEach(() => {
      mockRequest.body = mockGuessInput
    })

    it('should handle correct guess successfully', async () => {
      const mockQuote = { id: 1, author: 'Test Author' }
      const mockUser = { id: 1, score: 5, right_guessed_authors: {} }
      const mockTransactionResult = {
        user: { score: 6 },
        newCount: 1,
        email: 'test@example.com',
        author: 'Test Author',
        email_sent_for_author: false,
        authorStats: { 'Test Author': { count: 1, email_sent: false } },
      }

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(validateQuote as any).mockResolvedValue(mockQuote)
      ;(isGuessCorrect as any).mockReturnValue(true)
      ;(prisma.$transaction as any).mockResolvedValue(mockTransactionResult)
      ;(sendDiscountEmail as any).mockResolvedValue(undefined)

      await guessAuthor(mockRequest, mockReply)

      expect(validateQuote).toHaveBeenCalledWith(1)
      expect(isGuessCorrect).toHaveBeenCalledWith('Test Author', 'Test Author')
      expect(quotesLog.info).toHaveBeenCalledWith(
        { userId: 1, quoteId: 1, author: 'Test Author' },
        'User guessed correctly'
      )
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Correct answer',
          data: {
            correct: true,
            newScore: 6,
          },
        })
      )
    })

    it('should handle incorrect guess successfully', async () => {
      const mockQuote = { id: 1, author: 'Actual Author' }

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(validateQuote as any).mockResolvedValue(mockQuote)
      ;(isGuessCorrect as any).mockReturnValue(false)
      ;(prisma.quote.update as any).mockResolvedValue({ id: 1 })
      ;(prisma.userQuoteAttempt.upsert as any).mockResolvedValue({})
      ;(redisUtils.setWithExpiry as any).mockResolvedValue(undefined)

      await guessAuthor(mockRequest, mockReply)

      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { guessed_false: { increment: 1 } },
        select: { id: true },
      })
      expect(prisma.userQuoteAttempt.upsert).toHaveBeenCalledWith({
        where: { userId_quoteId: { userId: 1, quoteId: 1 } },
        update: { correct: false },
        create: { userId: 1, quoteId: 1, correct: false },
      })
      expect(redisUtils.setWithExpiry).toHaveBeenCalledWith(
        '1:failed_attempt',
        expect.any(String),
        43200
      )
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Wrong answer, try again tomorrow',
          data: { correct: false },
        })
      )
    })

    it('should return 404 when quote is not found', async () => {
      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(validateQuote as any).mockRejectedValue(new Error('Quote not found'))

      await guessAuthor(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Quote not found',
        })
      )
    })

    it('should handle internal server error', async () => {
      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(validateQuote as any).mockRejectedValue(new Error('Database error'))

      await guessAuthor(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
        })
      )
    })

    it('should send discount email when threshold is reached', async () => {
      const mockQuote = { id: 1, author: 'Test Author' }
      const mockTransactionResult = {
        user: { score: 6 },
        newCount: 3, // EMAIL_THRESHOLD
        email: 'test@example.com',
        author: 'Test Author',
        email_sent_for_author: false,
        authorStats: { 'Test Author': { count: 3, email_sent: false } },
      }

      ;(notFoundUserCheck as any).mockResolvedValue(undefined)
      ;(validateQuote as any).mockResolvedValue(mockQuote)
      ;(isGuessCorrect as any).mockReturnValue(true)
      ;(prisma.$transaction as any).mockResolvedValue(mockTransactionResult)
      ;(sendDiscountEmail as any).mockResolvedValue(undefined)
      ;(prisma.user.update as any).mockResolvedValue({ id: 1 })

      await guessAuthor(mockRequest, mockReply)

      expect(sendDiscountEmail).toHaveBeenCalledWith('test@example.com', 'Test Author')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { right_guessed_authors: { 'Test Author': { count: 3, email_sent: true } } },
        select: { id: true },
      })
    })
  })

  describe('getRelatedQuotes', () => {
    it('should return related quotes successfully', async () => {
      const mockOriginalQuote = {
        id: 1,
        content: 'Original quote',
        author: 'Test Author',
      }
      const mockRelatedQuotes = [
        { id: 2, content: 'Related quote 1' },
        { id: 3, content: 'Related quote 2' },
      ]

      mockRequest.params = { quoteId: '1' }
      ;(prisma.quote.findUnique as any).mockResolvedValue(mockOriginalQuote)
      ;(prisma.quote.findMany as any).mockResolvedValue(mockRelatedQuotes)

      await getRelatedQuotes(mockRequest, mockReply)

      expect(prisma.quote.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, content: true, author: true },
      })
      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: {
          author: 'Test Author',
          id: { not: 1 },
        },
        select: { id: true, content: true },
        take: 10,
        orderBy: { id: 'asc' },
      })
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Related quotes retrieved successfully',
          data: {
            originalQuote: mockOriginalQuote,
            relatedQuotes: mockRelatedQuotes,
          },
        })
      )
    })

    it('should return 400 for invalid quote ID', async () => {
      mockRequest.params = { quoteId: 'invalid' }

      await getRelatedQuotes(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid quote ID',
        })
      )
    })

    it('should return 400 for negative quote ID', async () => {
      mockRequest.params = { quoteId: '-1' }

      await getRelatedQuotes(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid quote ID',
        })
      )
    })

    it('should return 404 when original quote is not found', async () => {
      mockRequest.params = { quoteId: '999' }
      ;(prisma.quote.findUnique as any).mockResolvedValue(null)

      await getRelatedQuotes(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Quote not found',
        })
      )
    })

    it('should handle internal server error', async () => {
      mockRequest.params = { quoteId: '1' }
      ;(prisma.quote.findUnique as any).mockRejectedValue(new Error('Database error'))

      await getRelatedQuotes(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
        })
      )
    })
  })
})
