import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AuthTokens extends BaseSchema {
   protected tableName = 'auth_tokens'

   async up() {
      this.schema.createTable(this.tableName, (table) => {
         table.bigIncrements('id').primary()

         table
            .bigInteger('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')

         table.string('token_hash', 255).notNullable().unique()
         table.timestamp('expires_at', { useTz: true }).notNullable()
         table.timestamp('rotated_at', { useTz: true }).nullable()
         table.boolean('is_revoked').notNullable().defaultTo(false)

         table.string('ip_address', 50).nullable()
         table.text('user_agent').nullable()
         table.timestamp('last_used_at', { useTz: true }).nullable()

         table.timestamp('created_at', { useTz: true }).notNullable()

         table.index(['token_hash'])
         table.index(['user_id', 'is_revoked'])
         table.index(['expires_at'])
      })
   }

   async down() {
      this.schema.dropTable(this.tableName)
   }
}
