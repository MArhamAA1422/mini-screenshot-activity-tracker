import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Companies extends BaseSchema {
   protected tableName = 'companies'

   async up() {
      this.schema.createTable(this.tableName, (table) => {
         table.bigIncrements('id').primary()
         table.string('name', 255).notNullable()

         table
            .bigInteger('plan_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('plans')
            .onDelete('RESTRICT')

         table.string('owner_email', 255).notNullable()

         table.timestamp('created_at', { useTz: true }).notNullable()
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
