import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Employees extends BaseSchema {
  protected tableName = 'employees'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')

      table
        .bigInteger('company_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')

      table.string('name', 255).notNullable()
      table.string('email', 255).notNullable().unique()
      table.string('password', 255).notNullable()

      table.enum('role', ['admin', 'employee']).notNullable()

      table.timestamp('created_at', { useTz: false }).defaultTo(this.now())

      table.index(['company_id', 'name'], 'idx_company_name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
