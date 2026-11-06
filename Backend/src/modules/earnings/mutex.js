/**
 * In-process mutex for serializing operations per seller.
 * Ensures concurrent operations (like payouts) for the same seller execute sequentially.
 */

const locks = new Map()

/**
 * Runs an asynchronous task with an exclusive lock for the given seller.
 * @template T
 * @param {string|import('mongoose').Types.ObjectId} sellerId
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
export async function withSellerMutex(sellerId, task) {
  const key = sellerId?.toString() || 'global'
  const previous = locks.get(key) || Promise.resolve()

  // Chain our task after previous lock resolves or rejects
  const execution = previous
    .catch(() => {})
    .then(async () => {
      return await task()
    })

  locks.set(key, execution)

  // Clean up lock from map once execution is finished if still latest
  execution
    .finally(() => {
      if (locks.get(key) === execution) {
        locks.delete(key)
      }
    })
    .catch(() => {})

  return execution
}

export default withSellerMutex
