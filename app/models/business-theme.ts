import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Business from '#models/business'

export default class BusinessTheme extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare businessId: number

  @column()
  declare template: 'elegant' | 'modern' | 'minimal' | 'vibrant' | 'professional'

  @column()
  declare primaryColor: string

  @column()
  declare secondaryColor: string

  @column()
  declare accentColor: string

  @column()
  declare textColor: string

  @column()
  declare backgroundColor: string

  @column()
  declare fontHeading: string

  @column()
  declare fontBody: string

  @column()
  declare heroStyle: 'image' | 'gradient' | 'solid'

  @column()
  declare heroImage: string | null

  @column()
  declare heroGradient: string

  @column()
  declare buttonStyle: 'rounded' | 'pill' | 'square'

  @column()
  declare cardStyle: 'elevated' | 'bordered' | 'flat'

  @column()
  declare tagline: string | null

  @column()
  declare aboutText: string | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare galleryImages: string[] | null

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare socialLinks: {
    instagram?: string
    twitter?: string
    facebook?: string
    whatsapp?: string
    tiktok?: string
    website?: string
  } | null

  @column()
  declare showGallery: boolean

  @column()
  declare showAbout: boolean

  @column()
  declare showTestimonials: boolean

  @column()
  declare customCss: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  static TEMPLATES = {
    elegant: {
      name: 'Elegant',
      description: 'Sophisticated look with serif fonts and muted tones',
      preview: '/images/templates/elegant.png',
      defaults: {
        primaryColor: '#78716c',
        secondaryColor: '#fafaf9',
        accentColor: '#a8a29e',
        fontHeading: 'Playfair Display',
        fontBody: 'Lora',
      },
    },
    modern: {
      name: 'Modern',
      description: 'Bold and contemporary with vibrant accents',
      preview: '/images/templates/modern.png',
      defaults: {
        primaryColor: '#2563eb',
        secondaryColor: '#f8fafc',
        accentColor: '#f59e0b',
        fontHeading: 'Inter',
        fontBody: 'Inter',
      },
    },
    minimal: {
      name: 'Minimal',
      description: 'Ultra-clean with lots of whitespace',
      preview: '/images/templates/minimal.png',
      defaults: {
        primaryColor: '#171717',
        secondaryColor: '#ffffff',
        accentColor: '#525252',
        fontHeading: 'DM Sans',
        fontBody: 'DM Sans',
      },
    },
    vibrant: {
      name: 'Vibrant',
      description: 'Colorful and energetic for creative businesses',
      preview: '/images/templates/vibrant.png',
      defaults: {
        primaryColor: '#db2777',
        secondaryColor: '#fdf4ff',
        accentColor: '#8b5cf6',
        fontHeading: 'Poppins',
        fontBody: 'Poppins',
      },
    },
    professional: {
      name: 'Professional',
      description: 'Structured corporate feel for consultants',
      preview: '/images/templates/professional.png',
      defaults: {
        primaryColor: '#0f766e',
        secondaryColor: '#f0fdfa',
        accentColor: '#0d9488',
        fontHeading: 'Source Sans Pro',
        fontBody: 'Source Sans Pro',
      },
    },
  }

  static FONTS = [
    { name: 'Inter', category: 'sans-serif' },
    { name: 'DM Sans', category: 'sans-serif' },
    { name: 'Poppins', category: 'sans-serif' },
    { name: 'Source Sans Pro', category: 'sans-serif' },
    { name: 'Outfit', category: 'sans-serif' },
    { name: 'Space Grotesk', category: 'sans-serif' },
    { name: 'Playfair Display', category: 'serif' },
    { name: 'Lora', category: 'serif' },
    { name: 'Merriweather', category: 'serif' },
    { name: 'Crimson Pro', category: 'serif' },
  ]

  getCssVariables() {
    return `
      --theme-primary: ${this.primaryColor};
      --theme-secondary: ${this.secondaryColor};
      --theme-accent: ${this.accentColor};
      --theme-text: ${this.textColor};
      --theme-background: ${this.backgroundColor};
      --theme-font-heading: '${this.fontHeading}', sans-serif;
      --theme-font-body: '${this.fontBody}', sans-serif;
    `
  }

  getGoogleFontsUrl() {
    const fonts = [this.fontHeading, this.fontBody].filter(
      (f, i, arr) => arr.indexOf(f) === i
    )
    const formatted = fonts.map((f) => f.replace(/ /g, '+')).join('&family=')
    return `https://fonts.googleapis.com/css2?family=${formatted}:wght@400;500;600;700&display=swap`
  }
}

