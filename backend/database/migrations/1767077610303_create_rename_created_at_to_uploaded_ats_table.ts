import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RenameCreatedAtToUploadedAt extends BaseSchema {
   protected tableName = 'screenshots'

   public async up() {
      this.schema.alterTable(this.tableName, (table) => {
         table.dropColumn('created_at')
         table.timestamp('uploaded_at', { useTz: false }).defaultTo(this.now())
      })
   }

   public async down() {
      this.schema.alterTable(this.tableName, (table) => {
         table.dropColumn('uploaded_at')
         table.timestamp('created_at', { useTz: false }).defaultTo(this.now())
      })
   }
}
