import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Users extends BaseSchema {
   protected tableName = 'users'

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

         table.string('name', 255).notNullable()
         table.string('email', 255).notNullable().unique()
         table.string('password', 255).notNullable()
         table.enum('role', ['admin', 'employee']).notNullable()

         table.integer('screenshot_interval').unsigned().defaultTo(10)

         table.timestamp('created_at', { useTz: true }).notNullable()

         table.index(['name'])
         table.index(['email'])
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
