import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'featured_businesses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('business_id').unsigned().references('id').inTable('businesses').onDelete('CASCADE')
      table.string('plan').notNullable()
      table.integer('duration_days').notNullable()
      table.integer('amount').notNullable()
      table.string('payment_reference').nullable()
      table.string('paystack_reference').nullable()
      table.enum('status', ['pending', 'active', 'expired', 'cancelled']).defaultTo('pending')
      table.timestamp('starts_at').nullable()
      table.timestamp('expires_at').nullable()
      table.string('workspace_image').nullable()
      table.string('display_name').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['status', 'expires_at'])
      table.index('business_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}