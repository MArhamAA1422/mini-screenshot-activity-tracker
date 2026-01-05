import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RemoveSSIntervalFromUsers extends BaseSchema {
   protected tableName = 'users'

   async up() {
      this.schema.alterTable(this.tableName, (table) => {
         table.dropColumn('screenshot_interval')
      })
   }

   async down() {
      this.schema.alterTable(this.tableName, (table) => {
         table.integer('screenshot_interval').unsigned().defaultTo(10)
      })
   }
}
