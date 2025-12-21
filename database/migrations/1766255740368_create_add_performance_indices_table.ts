import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('bookings', (table) => {
      table.index('payment_reference', 'bookings_payment_reference_idx')
      table.index('customer_email', 'bookings_customer_email_idx')
      table.index(['business_id', 'status', 'date'], 'bookings_business_status_date_idx')
      table.index(['status', 'payment_status', 'date'], 'bookings_reminders_idx')
    })

    this.schema.alterTable('services', (table) => {
      table.index(['business_id', 'is_active'], 'services_business_active_idx')
    })

    this.schema.alterTable('users', (table) => {
      table.index(['business_id', 'is_active', 'role'], 'users_business_active_role_idx')
    })

    this.schema.alterTable('availabilities', (table) => {
      table.index(['business_id', 'is_active', 'day_of_week'], 'availabilities_business_active_day_idx')
    })

    this.schema.alterTable('transactions', (table) => {
      table.index('reference', 'transactions_reference_idx')
      table.index('provider_reference', 'transactions_provider_reference_idx')
    })
  }

  async down() {
    this.schema.alterTable('bookings', (table) => {
      table.dropIndex('', 'bookings_payment_reference_idx')
      table.dropIndex('', 'bookings_customer_email_idx')
      table.dropIndex('', 'bookings_business_status_date_idx')
      table.dropIndex('', 'bookings_reminders_idx')
    })

    this.schema.alterTable('services', (table) => {
      table.dropIndex('', 'services_business_active_idx')
    })

    this.schema.alterTable('users', (table) => {
      table.dropIndex('', 'users_business_active_role_idx')
    })

    this.schema.alterTable('availabilities', (table) => {
      table.dropIndex('', 'availabilities_business_active_day_idx')
    })

    this.schema.alterTable('transactions', (table) => {
      table.dropIndex('', 'transactions_reference_idx')
      table.dropIndex('', 'transactions_provider_reference_idx')
    })
  }
}
