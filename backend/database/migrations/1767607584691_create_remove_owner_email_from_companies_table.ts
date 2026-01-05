import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RemoveOwnerEmailFromCompanies extends BaseSchema {
   protected tableName = 'companies'

   async up() {
      this.schema.alterTable(this.tableName, (table) => {
         table.dropColumn('owner_email')
      })
   }

   async down() {
      this.schema.alterTable(this.tableName, (table) => {
         table.string('owner_email', 255).notNullable()
      })
   }
}
