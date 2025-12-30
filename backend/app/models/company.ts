import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Plan from './plan.js'
import User from './user.js'
import Screenshot from './screenshot.js'

export default class Company extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare planId: number

  @column()
  declare ownerEmail: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Screenshot)
  declare screenshots: HasMany<typeof Screenshot>

  async getOwner() {
    return User.query().where('company_id', this.id).where('role', 'admin').firstOrFail()
  }

  //   async getEmployeeCount(): Promise<number> {
  //     const result = await User.query()
  //       .where('company_id', this.id)
  //       .where('role', 'employee')
  //       .count('* as total')

  //     return Number(result[0].$extras.total)
  //   }

  //   async calculateMonthlyBill(): Promise<number> {
  //     const employeeCount = await this.getEmployeeCount()
  //     await this.load('plan')
  //     return employeeCount * this.plan.pricePerEmployee
  //   }

  //   // Serialization
  //   serializeExtras() {
  //     return {
  //       employee_count: this.$extras.employee_count,
  //       monthly_bill: this.$extras.monthly_bill,
  //     }
  //   }
}
