import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Screenshots extends BaseSchema {
   protected tableName = 'screenshots'

   async up() {
      this.schema.createTable(this.tableName, (table) => {
         table.bigIncrements('id').primary()

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
            .inTable('users')
            .onDelete('CASCADE')

         table.string('file_path', 500).notNullable()

         table.timestamp('captured_at', { useTz: true }).notNullable()

         table.timestamp('uploaded_at', { useTz: true }).notNullable()

         table.integer('hour').unsigned().notNullable()
         table.integer('minute_bucket').unsigned().notNullable()

         table.timestamp('created_at', { useTz: true }).notNullable()

         table.index(['user_id', 'captured_at'], 'idx_user_captured')
         table.index(['company_id', 'captured_at'], 'idx_company_captured')
         table.index(['user_id', 'captured_at', 'hour', 'minute_bucket'], 'idx_user_grouping')

         // Composite index for admin dashboard filters
         table.index(['company_id', 'user_id', 'captured_at'], 'idx_admin_filter')
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
