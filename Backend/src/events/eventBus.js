import EventEmitter from 'node:events'
import { EVENT_TYPES } from './eventTypes.js'
import { waitUntil } from '@vercel/functions'

class IsolatedEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50)
  }

  /**
   * Emits an event with error isolation so that no failing listener
   * breaks the request or throws unhandled errors.
   *
   * @param {string} eventName
   * @param {any} payload
   * @returns {boolean}
   */
  emit(eventName, payload) {
    const listeners = this.listeners(eventName)
    if (!listeners || listeners.length === 0) {
      return false
    }

    listeners.forEach((listener) => {
      try {
        const result = listener(payload)
        if (result && typeof result.then === 'function') {
          const safe = result.catch((error) => {
            console.error(`[EVENT_BUS] Async listener failed for event "${eventName}":`, error)
          })
          try { waitUntil(safe) } catch { /* خارج Vercel */ }
        }
      } catch (error) {
        console.error(`[EVENT_BUS] Sync listener failed for event "${eventName}":`, error)
      }
    })

    return true
  }
}

export const eventBus = new IsolatedEventBus()
export { EVENT_TYPES }
export default eventBus

