import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import Company from './company.js'
import AuthToken from './auth_token.js'
import Screenshot from './screenshot.js'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
   uids: ['email'],
   passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
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

   serializeExtras() {
      return {
         company_name: this.$extras.company_name,
         screenshot_count: this.$extras.screenshot_count,
         last_screenshot_at: this.$extras.last_screenshot_at,
      }
   }
}
