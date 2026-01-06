import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import Company from './company.js'
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

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @belongsTo(() => Company)
   declare company: BelongsTo<typeof Company>

   @hasMany(() => Screenshot)
   declare screenshots: HasMany<typeof Screenshot>

   isAdmin(): boolean {
      return this.role === 'admin'
   }

   isEmployee(): boolean {
      return this.role === 'employee'
   }

   serializeExtras() {
      return {
         company_name: this.$extras.company_name,
         screenshot_count: this.$extras.screenshot_count,
         last_screenshot_at: this.$extras.last_screenshot_at,
      }
   }
}
