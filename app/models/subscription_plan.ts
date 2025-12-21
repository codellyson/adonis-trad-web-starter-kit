import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Subscription from '#models/subscription'

export default class SubscriptionPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string // free, starter, pro, business

  @column()
  declare displayName: string

  @column()
  declare price: number // in kobo

  @column()
  declare interval: 'monthly' | 'yearly'

  @column()
  declare maxStaff: number | null // null = unlimited

  @column()
  declare maxBookingsPerMonth: number | null // null = unlimited

  @column()
  declare features: string[] | null // JSON array

  @column()
  declare description: string | null

  @column()
  declare isActive: boolean

  @column()
  declare sortOrder: number

  @column()
  declare paystackPlanCode: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Subscription)
  declare subscriptions: HasMany<typeof Subscription>

  get formattedPrice() {
    return `₦${(this.price / 100).toLocaleString()}`
  }

  get isUnlimitedStaff() {
    return this.maxStaff === null
  }

  get isUnlimitedBookings() {
    return this.maxBookingsPerMonth === null
  }
}
