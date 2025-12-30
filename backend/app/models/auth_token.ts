import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './employee.js'

export default class AuthToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare tokenHash: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare rotatedAt?: DateTime

  @column()
  declare isRevoked: boolean

  @column()
  declare ipAddress?: string

  @column()
  declare userAgent?: string

  @column.dateTime()
  declare lastUsedAt?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
