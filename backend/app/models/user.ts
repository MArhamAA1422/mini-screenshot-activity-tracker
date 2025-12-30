import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import Company from './company.js'
import AuthToken from './auth_token.js'
import Screenshot from './screenshot.js'

export default class User extends BaseModel {
   @column({ isPrimary: true })
   declare id: number

   @column()
   declare companyId: number

   @column()
   declare name: string

   @column()
   declare email: string

   @column({ serializeAs: null })
   declare password: string

   @column()
   declare role: 'admin' | 'employee'

   @column()
   declare screenshotInterval: number

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @belongsTo(() => Company)
   declare company: BelongsTo<typeof Company>

   @hasMany(() => AuthToken)
   declare authTokens: HasMany<typeof AuthToken>

   @hasMany(() => Screenshot)
   declare screenshots: HasMany<typeof Screenshot>

   // Hooks
   @beforeSave()
   static async hashPassword(user: User) {
      if (user.$dirty.password) {
         user.password = await hash.make(user.password)
      }
   }

   // Helper methods
   async verifyPassword(plainPassword: string): Promise<boolean> {
      return hash.verify(this.password, plainPassword)
   }

   isAdmin(): boolean {
      return this.role === 'admin'
   }

   isEmployee(): boolean {
      return this.role === 'employee'
   }

   async revokeAllTokens(): Promise<void> {
      await AuthToken.query().where('user_id', this.id).update({ is_revoked: true })
   }

   async getActiveTokens(): Promise<AuthToken[]> {
      return AuthToken.query()
         .where('user_id', this.id)
         .where('is_revoked', false)
         .where('expires_at', '>', DateTime.now().toSQL())
         .orderBy('created_at', 'desc')
   }

   // async getScreenshotStats(startDate: DateTime, endDate: DateTime) {
   //    const result = await Screenshot.query()
   //       .where('user_id', this.id)
   //       .whereBetween('captured_at', [startDate.toSQL(), endDate.toSQL()])
   //       .count('* as total')
   //       .groupBy('user_id')
   //       .first()

   //    return {
   //       total_screenshots: result ? Number(result.$extras.total) : 0,
   //       date_range: {
   //          start: startDate.toISODate(),
   //          end: endDate.toISODate(),
   //       },
   //    }
   // }

   // Serialization
   serializeExtras() {
      return {
         company_name: this.$extras.company_name,
         screenshot_count: this.$extras.screenshot_count,
         last_screenshot_at: this.$extras.last_screenshot_at,
      }
   }
}
