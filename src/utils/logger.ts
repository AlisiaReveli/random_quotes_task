import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:  {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } })

export const log = {
  info: (message: string, data?: any) => logger.info(data, message),
  error: (message: string, data?: any) => logger.error(data, message),
  warn: (message: string, data?: any) => logger.warn(data, message),
  debug: (message: string, data?: any) => logger.debug(data, message)
}

export const authLog = logger.child({ context: 'auth' })
export const quotesLog = logger.child({ context: 'quotes' })
export const userLog = logger.child({ context: 'user' })
export const dbLog = logger.child({ context: 'database' })

export default logger