import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const stores: { [key: string]: RateLimitStore } = {}

function getStore(name: string): RateLimitStore {
  if (!stores[name]) {
    stores[name] = {}
  }
  return stores[name]
}

function cleanupExpired(store: RateLimitStore) {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  }
}

setInterval(() => {
  for (const name in stores) {
    cleanupExpired(stores[name])
  }
}, 60000)

export default class RateLimitMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      store?: string
      maxAttempts?: number
      decayMinutes?: number
    } = {}
  ) {
    const { store: storeName = 'default', maxAttempts = 60, decayMinutes = 1 } = options
    const store = getStore(storeName)

    const ip = ctx.request.ip()
    const key = `${ip}:${ctx.request.url()}`
    const now = Date.now()
    const decayMs = decayMinutes * 60 * 1000

    if (!store[key] || store[key].resetAt < now) {
      store[key] = {
        count: 0,
        resetAt: now + decayMs,
      }
    }

    store[key].count++

    ctx.response.header('X-RateLimit-Limit', String(maxAttempts))
    ctx.response.header('X-RateLimit-Remaining', String(Math.max(0, maxAttempts - store[key].count)))
    ctx.response.header('X-RateLimit-Reset', String(Math.ceil(store[key].resetAt / 1000)))

    if (store[key].count > maxAttempts) {
      const retryAfter = Math.ceil((store[key].resetAt - now) / 1000)
      ctx.response.header('Retry-After', String(retryAfter))

      return ctx.response.status(429).send({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      })
    }

    return next()
  }
}

