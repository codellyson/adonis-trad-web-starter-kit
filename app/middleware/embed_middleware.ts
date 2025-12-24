import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to allow iframe embedding for embed routes
 * This overrides the default X-Frame-Options: DENY for embed endpoints
 */
export default class EmbedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const url = ctx.request.url()

    // Allow iframe embedding for embed routes
    if (url.includes('/embed') || (url.includes('/book/') && url.includes('/slots'))) {
      // Remove X-Frame-Options header if set by shield
      ctx.response.removeHeader('X-Frame-Options')
      
      // Set permissive CSP for embed routes
      ctx.response.header('X-Frame-Options', 'ALLOWALL')
      ctx.response.header('Content-Security-Policy', "frame-ancestors *;")
      
      // Add CORS headers for API endpoints used by embed
      if (url.includes('/slots') || url.includes('/service/')) {
        const origin = ctx.request.header('origin')
        if (origin) {
          ctx.response.header('Access-Control-Allow-Origin', origin)
          ctx.response.header('Access-Control-Allow-Credentials', 'true')
        } else {
          ctx.response.header('Access-Control-Allow-Origin', '*')
        }
        ctx.response.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-TOKEN')
        
        // Handle preflight requests
        if (ctx.request.method() === 'OPTIONS') {
          return ctx.response.noContent()
        }
      }
    }

    await next()
  }
}

