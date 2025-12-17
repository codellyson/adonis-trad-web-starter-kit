import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('active', 'pending', 'ready', 'cancelled', 'expired'));
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('active', 'pending', 'cancelled', 'expired'));
    `)
  }
}
