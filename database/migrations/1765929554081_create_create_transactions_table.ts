import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.enum('type', ['credit', 'debit']).notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('description').notNullable()
      table.string('reference').unique().notNullable()
      table.enum('status', ['pending', 'completed', 'failed']).defaultTo('pending')
      table.json('metadata').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
