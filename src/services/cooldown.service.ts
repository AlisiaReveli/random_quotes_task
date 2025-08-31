import { redisUtils } from '../utils/redis'

export interface CooldownResult {
  allowed: boolean
  message?: string
}

export class CooldownService {
  /**
   * Check if a user is allowed to make a guess (not in cooldown period)
   * @param userId - The user ID to check
   * @returns CooldownResult indicating if the user can guess and any message
   */
  static async checkGuessCooldown(userId: number): Promise<CooldownResult> {
    try {
      if (!Number.isFinite(userId)) {
        return {
          allowed: false,
          message: 'Invalid user'
        }
      }

      const attemptKey = `${userId}:failed_attempt`
      const existingAttempt = await redisUtils.get(attemptKey)
      
      if (existingAttempt) {
        return {
          allowed: false,
          message: 'You already tried guessing. Try again after 12 hours.'
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Cooldown check error:', error)
      return {
        allowed: false,
        message: 'Internal server error'
      }
    }
  }
}
