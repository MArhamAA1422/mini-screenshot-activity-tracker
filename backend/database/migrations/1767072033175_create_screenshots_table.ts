import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Screenshots extends BaseSchema {
  protected tableName = 'screenshots'

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

      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')

      table.string('file_path').notNullable()

      table.timestamp('captured_at', { useTz: false }).notNullable()
      table.timestamp('created_at', { useTz: false }).defaultTo(this.now())

      table.date('date').notNullable()
      table.integer('hour').notNullable()
      table.integer('minute_bucket').notNullable()

      table.index(['company_id', 'user_id', 'date'], 'idx_company_user_date')
      table.index(['company_id', 'user_id', 'date', 'hour', 'minute_bucket'], 'idx_grouping')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
