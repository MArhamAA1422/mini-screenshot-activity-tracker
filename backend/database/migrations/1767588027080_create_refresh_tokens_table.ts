import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
   protected tableName = 'refresh_tokens'

   async up() {
      this.schema.createTable(this.tableName, (table) => {
         table.bigIncrements('id').primary()

         table
            .bigInteger('user_id')
            .unsigned()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
            .notNullable()

         table.string('token_hash', 255).notNullable().unique()

         table.timestamp('expires_at').notNullable()
         table.boolean('revoked').defaultTo(false).notNullable()

         table.string('user_agent', 500).nullable()
         table.string('ip_address', 45).nullable()

         table.timestamp('created_at').notNullable()
         table.timestamp('updated_at').notNullable()

         table.index(['user_id', 'revoked'])
         table.index('expires_at')
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
