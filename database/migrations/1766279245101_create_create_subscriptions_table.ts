import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('business_id').unsigned().references('id').inTable('businesses').onDelete('CASCADE')
      table.integer('plan_id').unsigned().references('id').inTable('subscription_plans').onDelete('SET NULL')
      table.string('status').notNullable().defaultTo('active') // active, past_due, cancelled, trialing
      table.string('paystack_subscription_code').nullable().unique() // Paystack subscription code
      table.string('paystack_customer_code').nullable() // Paystack customer code
      table.timestamp('current_period_start').nullable()
      table.timestamp('current_period_end').nullable()
      table.boolean('cancel_at_period_end').notNullable().defaultTo(false)
      table.timestamp('cancelled_at').nullable()
      table.timestamp('trial_ends_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      
      table.index(['business_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
