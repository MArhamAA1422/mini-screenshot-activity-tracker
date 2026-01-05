import { BaseSchema } from '@adonisjs/lucid/schema'

export default class RemoveHourAndMinuteBucketFromScreenshots extends BaseSchema {
   protected tableName = 'screenshots'

   async up() {
      this.schema.alterTable(this.tableName, (table) => {
         table.dropIndex(['user_id', 'captured_at', 'hour', 'minute_bucket'], 'idx_user_grouping')

         table.dropColumn('hour')
         table.dropColumn('minute_bucket')
      })
   }

   async down() {
      this.schema.alterTable(this.tableName, (table) => {
         table.integer('hour').unsigned().notNullable()
         table.integer('minute_bucket').unsigned().notNullable()

         table.index(['user_id', 'captured_at', 'hour', 'minute_bucket'], 'idx_user_grouping')
      })
   }
}
