import edge from 'edge.js'
import { migrate } from 'edge.js/plugins/migrate'
import env from '#start/env'
import { DateTime } from 'luxon'

edge.use(migrate)

edge.global('isDev', env.get('NODE_ENV') === 'development')
edge.global('DateTime', DateTime)
edge.global('appName', 'FastAppoint')
edge.global('appDomain', env.get('APP_DOMAIN', 'fastappoint.com'))
edge.global('appUrl', () => {
  const isDev = env.get('NODE_ENV') === 'development'
  const port = env.get('PORT', 3333)

  if (isDev) {
    return `http://localhost:${port}`
  }

  return env.get('APP_URL', `https://${env.get('APP_DOMAIN', 'fastappoint.com')}`)
})
edge.global('appPort', env.get('PORT', 3333))

// Helper function to generate booking URL
edge.global('bookingUrl', (slug: string) => {
  const isDev = env.get('NODE_ENV') === 'development'
  const port = env.get('PORT', 3333)

  if (isDev) {
    return `http://${slug}.localhost:${port}`
  }

  const domain = env.get('APP_DOMAIN', 'fastappoint.com')
  return `https://${slug}.${domain}`
})

// Helper to encode URL for sharing
edge.global('encodeUrl', (url: string) => {
  return encodeURIComponent(url)
})
