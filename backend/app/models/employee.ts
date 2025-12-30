import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
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

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @belongsTo(() => Company)
   declare company: BelongsTo<typeof Company>

   @hasMany(() => AuthToken)
   declare authTokens: HasMany<typeof AuthToken>

   @hasMany(() => Screenshot)
   declare screenshots: HasMany<typeof Screenshot>

   // generateToken() {
   //    return JwtService.sign({ id: this.id, role: this.role })
   // }
}
