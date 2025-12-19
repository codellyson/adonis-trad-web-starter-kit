import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Business from '#models/business'
import env from '#start/env'

export default class SubdomainMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const host = ctx.request.host() || ''
    const baseDomain = env.get('APP_DOMAIN', 'bookme.ng')
    const url = ctx.request.url()

    // Skip subdomain processing for main domain access
    if (
      host === 'localhost' ||
      host.startsWith('localhost:') ||
      host === '127.0.0.1' ||
      host.startsWith('127.0.0.1:')
    ) {
      return next()
    }

    let subdomain: string | null = null

    if (host.includes('.localhost')) {
      subdomain = host.split('.localhost')[0]
    } else if (host.includes('.lvh.me')) {
      subdomain = host.split('.lvh.me')[0]
    } else if (host.endsWith(`.${baseDomain}`)) {
      subdomain = host.replace(`.${baseDomain}`, '')
    } else if (host === baseDomain) {
      return next()
    } else {
      return next()
    }

    if (!subdomain || subdomain === 'www') {
      return next()
    }

    if (subdomain === 'app') {
      ctx.subdomainType = 'app'
      return next()
    }

    if (subdomain === 'api') {
      ctx.subdomainType = 'api'
      return next()
    }

    const business = await Business.query()
      .where('slug', subdomain)
      .where('isActive', true)
      .where('isOnboarded', true)
      .preload('services', (query) => {
        query
          .where('isActive', true)
          .orderBy('sortOrder')
          .preload('staff', (staffQuery) => {
            staffQuery.where('isActive', true)
          })
      })
      .preload('availabilities', (query) => query.where('isActive', true))
      .first()

    if (business) {
      ctx.subdomainType = 'booking'
      ctx.currentBusiness = business

      if (url === '/' || url === '') {
        return ctx.response.redirect(`/book/${business.slug}`)
      }

      if (url.startsWith('/service/') || url.startsWith('/booking/')) {
        const newUrl = url.replace(/^\//, `/book/${business.slug}/`)
        return ctx.response.redirect(newUrl)
      }
    }

    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    subdomainType?: 'app' | 'api' | 'booking'
    currentBusiness?: Business
  }
}
