import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Card extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare bridgecardId: string

  @column({ serializeAs: null })
  declare cardPan: string

  @column()
  declare lastFour: string

  @column({ serializeAs: null })
  declare cvv: string

  @column()
  declare expiryMonth: string

  @column()
  declare expiryYear: string

  @column()
  declare brand: string

  @column()
  declare currency: 'NGN' | 'USD'

  @column()
  declare status: 'active' | 'frozen' | 'terminated'

  @column()
  declare billingAddress: string | null

  @column()
  declare billingCity: string | null

  @column()
  declare billingState: string | null

  @column()
  declare billingCountry: string

  @column()
  declare billingZip: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get expiry() {
    return `${this.expiryMonth}/${this.expiryYear.slice(-2)}`
  }

  get maskedPan() {
    return `**** **** **** ${this.lastFour}`
  }
}
