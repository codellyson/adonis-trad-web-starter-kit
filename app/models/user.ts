import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Business from '#models/business'
import Service from '#models/service'
import Availability from '#models/availability'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare businessId: number | null

  @column()
  declare fullName: string

  @column()
  declare email: string

  @column()
  declare phone: string | null

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare avatar: string | null

  @column()
  declare role: 'owner' | 'admin' | 'staff'

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  @manyToMany(() => Service, {
    pivotTable: 'staff_services',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'service_id',
  })
  declare services: ManyToMany<typeof Service>

  @hasMany(() => Availability)
  declare availabilities: HasMany<typeof Availability>

  get isOwner() {
    return this.role === 'owner'
  }

  get isAdmin() {
    return this.role === 'admin'
  }

  get isStaff() {
    return this.role === 'staff'
  }
}
