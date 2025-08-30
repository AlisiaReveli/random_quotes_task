import { FastifyReply, FastifyRequest } from 'fastify'
import axios from 'axios'
import { QuoteInput } from './quote.schema'

interface Quote {
  id: string
  content: string
  author: string
  tags?: string[]
  length?: number
}

interface QuotesResponse {
  quotes: Quote[]
  total: number
  skip: number
  limit: number
}

export async function getQuotes(req: FastifyRequest<{
  Querystring: QuoteInput
}>, reply: FastifyReply) {
  try {
    const {limit} = req.query;
    
    const response = await axios.get<QuotesResponse>(
      `https://dummyjson.com/quotes?limit=${limit}`, 
      { timeout: 5000 }
    )
    
    console.log(response.data)
    const quotesData = response.data

    return reply.code(200).send({
      success: true,
      data: quotesData
    })

  } catch (error: any) {
    req.log.error('Failed to fetch quotes:', error)
    
    return reply.code(500).send({
      success: false,
      error: error.message || 'Unknown error'
    })
  }
}