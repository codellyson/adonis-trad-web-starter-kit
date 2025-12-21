import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscription_payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('subscription_id').unsigned().references('id').inTable('subscriptions').onDelete('CASCADE')
      table.integer('amount').notNullable() // in kobo
      table.string('status').notNullable().defaultTo('pending') // success, failed, pending
      table.string('paystack_reference').nullable().unique()
      table.string('paystack_transaction_reference').nullable()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      
      table.index(['subscription_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
