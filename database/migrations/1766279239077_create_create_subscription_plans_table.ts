import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscription_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable().unique() // free, starter, pro, business
      table.string('display_name').notNullable()
      table.integer('price').notNullable() // in kobo (₦1 = 100 kobo)
      table.string('interval').notNullable().defaultTo('monthly') // monthly, yearly
      table.integer('max_staff').nullable() // null = unlimited
      table.integer('max_bookings_per_month').nullable() // null = unlimited
      table.json('features').nullable() // JSON array of features
      table.text('description').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.string('paystack_plan_code').nullable() // Paystack plan code for recurring billing
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
