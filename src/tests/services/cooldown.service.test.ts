import { jest } from '@jest/globals'
import { CooldownService } from '../../services/cooldown.service'

// Mock redis utils
jest.mock('../../utils/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }
}))

import { redisUtils } from '../../utils/redis'

// Type the mocked function
const mockRedisGet = redisUtils.get as any

describe('CooldownService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkGuessCooldown', () => {
    it('should allow guess when no cooldown exists', async () => {
      mockRedisGet.mockResolvedValue(null)

      const result = await CooldownService.checkGuessCooldown(1)

      expect(result).toEqual({ allowed: true })
      expect(mockRedisGet).toHaveBeenCalledWith('1:failed_attempt')
    })

    it('should block guess when cooldown exists', async () => {
      mockRedisGet.mockResolvedValue('some_attempt_data')

      const result = await CooldownService.checkGuessCooldown(1)

      expect(result).toEqual({
        allowed: false,
        message: 'You already tried guessing. Try again after 12 hours.'
      })
      expect(mockRedisGet).toHaveBeenCalledWith('1:failed_attempt')
    })

    it('should handle invalid user ID', async () => {
      const result = await CooldownService.checkGuessCooldown(NaN)

      expect(result).toEqual({
        allowed: false,
        message: 'Invalid user'
      })
      expect(mockRedisGet).not.toHaveBeenCalled()
    })

    it('should handle redis errors gracefully', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis connection failed'))

      const result = await CooldownService.checkGuessCooldown(1)

      expect(result).toEqual({
        allowed: false,
        message: 'Internal server error'
      })
    })
  })
})
