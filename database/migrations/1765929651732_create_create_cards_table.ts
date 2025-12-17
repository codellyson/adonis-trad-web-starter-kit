import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('bridgecard_id').unique().notNullable()
      table.string('card_pan', 19).notNullable()
      table.string('last_four', 4).notNullable()
      table.string('cvv', 4).notNullable()
      table.string('expiry_month', 2).notNullable()
      table.string('expiry_year', 4).notNullable()
      table.string('brand').notNullable()
      table.enum('currency', ['NGN', 'USD']).defaultTo('NGN')
      table.enum('status', ['active', 'frozen', 'terminated']).defaultTo('active')
      table.string('billing_address').nullable()
      table.string('billing_city').nullable()
      table.string('billing_state').nullable()
      table.string('billing_country').defaultTo('Nigeria')
      table.string('billing_zip').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
