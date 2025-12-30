import { BaseSchema } from '@adonisjs/lucid/schema'

export default class Plans extends BaseSchema {
   protected tableName = 'plans'

   async up() {
      this.schema.createTable(this.tableName, (table) => {
         table.bigIncrements('id').primary()
         table.string('name', 100).notNullable()
         table.decimal('price_per_employee', 10, 2).notNullable()
         table.timestamp('created_at', { useTz: true }).notNullable()
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
