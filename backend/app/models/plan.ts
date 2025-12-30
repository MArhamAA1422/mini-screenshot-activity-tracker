import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Company from './company.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Plan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare pricePerEmployee: number

  @column.dateTime({
    autoCreate: true,
    serialize: (value) => value?.toISO(),
  })
  declare createdAt: DateTime

  @hasMany(() => Company)
  declare companies: HasMany<typeof Company>
}
