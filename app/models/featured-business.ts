import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Business from '#models/business'

export default class FeaturedBusiness extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare businessId: number

  @column()
  declare plan: string

  @column()
  declare durationDays: number

  @column()
  declare amount: number

  @column()
  declare paymentReference: string | null

  @column()
  declare paystackReference: string | null

  @column()
  declare status: 'pending' | 'active' | 'expired' | 'cancelled'

  @column.dateTime()
  declare startsAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare workspaceImage: string | null

  @column()
  declare displayName: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  get isActive() {
    return this.status === 'active' && this.expiresAt && this.expiresAt > DateTime.now()
  }

  get daysRemaining() {
    if (!this.expiresAt) return 0
    const diff = this.expiresAt.diff(DateTime.now(), 'days').days
    return Math.max(0, Math.ceil(diff))
  }

  static PLANS = {
    weekly: {
      name: 'Weekly',
      duration: 7,
      amount: 5000,
      description: 'Featured for 7 days',
    },
    monthly: {
      name: 'Monthly',
      duration: 30,
      amount: 15000,
      description: 'Featured for 30 days',
      popular: true,
    },
    quarterly: {
      name: 'Quarterly',
      duration: 90,
      amount: 35000,
      description: 'Featured for 90 days',
      savings: '22% off',
    },
  }
}

