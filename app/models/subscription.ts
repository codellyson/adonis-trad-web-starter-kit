import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Card from '#models/card'

export default class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare cardId: number | null

  @column()
  declare serviceId: string

  @column()
  declare serviceName: string

  @column()
  declare amount: number

  @column()
  declare status: 'active' | 'pending' | 'ready' | 'cancelled' | 'expired'

  @column.date()
  declare nextBillingDate: DateTime | null

  @column.date()
  declare startedAt: DateTime | null

  @column.date()
  declare cancelledAt: DateTime | null

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Card)
  declare card: BelongsTo<typeof Card>
}
