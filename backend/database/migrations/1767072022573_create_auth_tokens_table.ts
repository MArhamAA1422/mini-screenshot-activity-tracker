import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AuthTokens extends BaseSchema {
  protected tableName = 'auth_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')

      table
        .bigInteger('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')

      table.string('token_hash', 255).notNullable().unique()

      table.timestamp('expires_at', { useTz: false }).notNullable()
      table.timestamp('rotated_at', { useTz: false }).nullable()

      table.boolean('is_revoked').notNullable().defaultTo(false)

      table.string('ip_address', 45).nullable()
      table.string('user_agent', 500).nullable()

      table.timestamp('last_used_at', { useTz: false }).nullable()
      table.timestamp('created_at', { useTz: false }).defaultTo(this.now())

      table.index(['user_id', 'is_revoked'])
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
