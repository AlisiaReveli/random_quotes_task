import cron from 'node-cron'
import axios from 'axios'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ExternalQuote {
  id: number
  quote: string
  author: string
}

interface ExternalQuotesResponse {
  quotes: ExternalQuote[]
  total: number
  skip: number
  limit: number
}

export class SchedulerService {
  private isRunning = false

  constructor() {
    this.startQuoteSyncJob()
  }

  private startQuoteSyncJob() {
    // Run every hour to sync quotes from external API
    cron.schedule('0 * * * *', async () => {
      console.log('Starting quote sync job...')
      await this.syncQuotesFromExternalAPI()
    })

    // Also run immediately on startup
    this.syncQuotesFromExternalAPI()
  }

  private async syncQuotesFromExternalAPI() {
    if (this.isRunning) {
      console.log('Quote sync job already running, skipping...')
      return
    }

    this.isRunning = true

    try {
      console.log('Fetching quotes from external API...')
      const response = await axios.get<ExternalQuotesResponse>(
        'https://dummyjson.com/quotes?limit=0',
        { timeout: 30000 }
      )

      const externalQuotes = response.data.quotes
      console.log(`Fetched ${externalQuotes.length} quotes from API`)

      const batchSize = 50
      let processedCount = 0
      let createdCount = 0
      let updatedCount = 0

      for (let i = 0; i < externalQuotes.length; i += batchSize) {
        const batch = externalQuotes.slice(i, i + batchSize)

        const upsertResults = await Promise.all(
          batch.map(async (q) => {
            const upserted = await prisma.quote.upsert({
              where: { id: q.id },
              update: { content: q.quote, author: q.author, updatedAt: new Date() },
              create: { id: q.id, content: q.quote, author: q.author, createdAt:new Date()}
            })
            return upserted
          })
        )

        processedCount += batch.length
        upsertResults.forEach((res: any) => {
          const now = new Date()
          if ((now.getTime() - res.createdAt.getTime()) < 1000) createdCount++
        })

        console.log(`Processed ${Math.min(processedCount, externalQuotes.length)}/${externalQuotes.length} quotes`)
        if (i + batchSize < externalQuotes.length) await new Promise(r => setTimeout(r, 50))
      }

      console.log(`Quote sync completed ✅ Processed: ${processedCount}, New added to existing quotes: ${createdCount}`)

    } catch (error) {
      console.error('Error syncing quotes from external API:', error)
    } finally {
      this.isRunning = false
    }
  }
}
