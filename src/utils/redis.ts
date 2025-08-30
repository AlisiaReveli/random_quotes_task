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

export default redis