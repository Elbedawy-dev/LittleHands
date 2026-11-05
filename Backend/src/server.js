import { env } from './config/env.js'
import { connectDB, disconnectDB } from './db/connection.js'
import { createApp } from './app.js'
import { jobs } from './jobs/index.js'
import { eventBus, EVENT_TYPES } from './events/index.js'

async function startServer() {
  try {
    // 1. Connect to MongoDB
    console.info('[BOOT] Connecting to MongoDB...')
    await connectDB(env.MONGODB_URI)
    console.info('[BOOT] Connected to MongoDB database successfully.')

    // 2. Register core Event Listeners
    eventBus.on(EVENT_TYPES.USER_REGISTERED, (payload) => {
      console.info(`[EVENT] User registered: ${payload.user?.email}`)
    })
    eventBus.on(EVENT_TYPES.SELLER_CREATED, (payload) => {
      console.info(`[EVENT] Seller created: ${payload.user?.email}`)
    })
    eventBus.on(EVENT_TYPES.ORDER_CREATED, (payload) => {
      console.info(`[EVENT] Order created: ${payload.order?.number}`)
    })
    eventBus.on(EVENT_TYPES.PAYMENT_CONFIRMED, (payload) => {
      console.info(`[EVENT] Payment confirmed for order: ${payload.order?.number}`)
    })

    // 3. Start Background Job Registry
    jobs.start()

    // 4. Create and start HTTP Application
    const app = createApp()
    const server = app.listen(env.PORT, () => {
      console.info(`[BOOT] Little Hands Backend server running on http://localhost:${env.PORT}`)
      console.info(`[BOOT] Environment: ${env.NODE_ENV} | API Base: /api/v1`)
    })

    // 5. Graceful shutdown handler
    const shutdown = async (signal) => {
      console.info(`\n[SHUTDOWN] Received ${signal}. Closing gracefully...`)
      jobs.stop()
      server.close(async () => {
        console.info('[SHUTDOWN] HTTP server closed.')
        await disconnectDB()
        console.info('[SHUTDOWN] Database connection closed.')
        process.exit(0)
      })

      // Force exit after 10 seconds timeout
      setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown due to timeout.')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

