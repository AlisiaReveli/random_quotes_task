export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  timestamp: string
}

export const createResponse = {
  success: <T>(data: T, message?: string, statusCode = 200) => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }),
  
  error: (message: string, statusCode = 500, error?: string) => ({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString()
  })
}