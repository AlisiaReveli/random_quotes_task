import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = createClient({ url })

redis.on('error', (err) => {
  console.error('Redis Client Error', err)
})

async function init() {
  if (!redis.isOpen) await redis.connect()
}
init()

export const redisUtils = {
  /**
   * Set a key-value pair in Redis with optional expiration
   * @param key - The Redis key
   * @param value - The value to store
   * @param options - Optional Redis set options (EX, PX, etc.)
   */
  async set(key: string, value: string, options?: { EX?: number; PX?: number; NX?: boolean; XX?: boolean }) {
    await init() 
    return await redis.set(key, value, options)
  },

  /**
   * Get a value from Redis by key
   * @param key - The Redis key
   * @returns The value or null if not found
   */
  async get(key: string): Promise<string | null> {
    await init()
    return await redis.get(key)
  },

  /**
   * Delete a key from Redis
   * @param key - The Redis key
   * @returns Number of keys deleted
   */
  async del(key: string): Promise<number> {
    await init() 
    return await redis.del(key)
  },

  /**
   * Check if a key exists in Redis
   * @param key - The Redis key
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    await init() 
    const result = await redis.exists(key)
    return result === 1
  },

  /**
   * Set a key with expiration time in seconds
   * @param key - The Redis key
   * @param value - The value to store
   * @param seconds - Expiration time in seconds
   */
  async setWithExpiry(key: string, value: string, seconds: number) {
    return await this.set(key, value, { EX: seconds })
  },

  /**
   * Get multiple keys at once
   * @param keys - Array of Redis keys
   * @returns Array of values (null for missing keys)
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    await init() 
    return await redis.mGet(keys)
  },

  /**
   * Set multiple key-value pairs at once
   * @param keyValuePairs - Object with key-value pairs
   */
  async mset(keyValuePairs: Record<string, string>) {
    await init()
    return await redis.mSet(keyValuePairs)
  }
}

export default redis