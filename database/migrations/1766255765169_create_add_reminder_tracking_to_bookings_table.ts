import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('reminder_24h_sent_at').nullable()
      table.timestamp('reminder_1h_sent_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reminder_24h_sent_at')
      table.dropColumn('reminder_1h_sent_at')
    })
  }
}
