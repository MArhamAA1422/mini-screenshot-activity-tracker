import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class RefreshToken extends BaseModel {
   @column({ isPrimary: true })
   declare id: number

   @column()
   declare userId: number

   @column()
   declare token: string

   @column.dateTime()
   declare expiresAt: DateTime

   @column()
   declare revoked: boolean

   @column()
   declare userAgent: string | null

   @column()
   declare ipAddress: string | null

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @column.dateTime({ autoCreate: true, autoUpdate: true })
   declare updatedAt: DateTime

   @belongsTo(() => User)
   declare user: BelongsTo<typeof User>

   /**
    * Check if token is expired
    */
   isExpired(): boolean {
      return this.expiresAt < DateTime.now()
   }

   /**
    * Check if token is valid (not revoked and not expired)
    */
   isValid(): boolean {
      return !this.revoked && !this.isExpired()
   }
}
