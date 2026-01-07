import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RemoveHourAndMinuteBucketFromScreenshots extends BaseSchema {
   protected tableName = 'screenshots'

   async up() {
      this.schema.alterTable(this.tableName, (table) => {
         // Drop FKs first (order matters)
         // table.dropForeign('company_id')
         // table.dropForeign('user_id')

         // Drop indexes
         table.dropIndex(['user_id', 'captured_at'], 'idx_user_captured')
         table.dropIndex(['company_id', 'captured_at'], 'idx_company_captured')

         // Re-add foreign keys properly
         table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE')

         table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      })
   }

   async down() {
      this.schema.alterTable(this.tableName, (table) => {
         // Remove updated FKs
         table.dropForeign('company_id')
         table.dropForeign('user_id')

         // Re-create original indexes
         table.index(['user_id', 'captured_at'], 'idx_user_captured')

         // Re-add FKs
         table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE')

         table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      })
   }
}
