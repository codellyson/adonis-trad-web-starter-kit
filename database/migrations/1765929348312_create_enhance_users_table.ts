import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone', 15).nullable()
      table.string('bvn', 11).nullable()
      table.string('nin', 11).nullable()
      table.enum('kyc_status', ['pending', 'verified', 'failed']).defaultTo('pending')
      table.string('virtual_account_number', 20).nullable()
      table.string('virtual_account_bank').nullable()
      table.string('virtual_account_name').nullable()
      table.decimal('wallet_balance', 12, 2).defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('phone')
      table.dropColumn('bvn')
      table.dropColumn('nin')
      table.dropColumn('kyc_status')
      table.dropColumn('virtual_account_number')
      table.dropColumn('virtual_account_bank')
      table.dropColumn('virtual_account_name')
      table.dropColumn('wallet_balance')
    })
  }
}
