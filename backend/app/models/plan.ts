import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Company from './company.js'

export default class Plan extends BaseModel {
   @column({ isPrimary: true })
   declare id: number

   @column()
   declare name: string

   @column()
   declare pricePerEmployee: number

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @hasMany(() => Company)
   declare companies: HasMany<typeof Company>

   serializeExtras() {
      return {
         companies_count: this.$extras.companies_count,
      }
   }
}
