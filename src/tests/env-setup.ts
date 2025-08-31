// Test environment setup
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_EXPIRATION = '1h'
process.env.EMAIL_THRESHOLD = '3'
process.env.COOLDOWN_TIME = '43200'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379'
