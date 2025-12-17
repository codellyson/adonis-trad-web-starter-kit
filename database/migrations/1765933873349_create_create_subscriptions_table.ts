import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('card_id').unsigned().references('id').inTable('cards').onDelete('SET NULL').nullable()
      table.string('service_id').notNullable()
      table.string('service_name').notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.enum('status', ['active', 'pending', 'cancelled', 'expired']).defaultTo('pending')
      table.date('next_billing_date').nullable()
      table.date('started_at').nullable()
      table.date('cancelled_at').nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
