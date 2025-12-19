import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'business_themes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('business_id')
        .unsigned()
        .references('id')
        .inTable('businesses')
        .onDelete('CASCADE')
        .unique()

      table
        .enum('template', ['elegant', 'modern', 'minimal', 'vibrant', 'professional'])
        .defaultTo('modern')

      table.string('primary_color').defaultTo('#2563eb')
      table.string('secondary_color').defaultTo('#f5f5f4')
      table.string('accent_color').defaultTo('#f59e0b')
      table.string('text_color').defaultTo('#1c1917')
      table.string('background_color').defaultTo('#ffffff')

      table.string('font_heading').defaultTo('Inter')
      table.string('font_body').defaultTo('Inter')

      table.enum('hero_style', ['image', 'gradient', 'solid']).defaultTo('gradient')
      table.string('hero_image').nullable()
      table.string('hero_gradient').defaultTo('from-primary/10 to-primary/5')

      table.enum('button_style', ['rounded', 'pill', 'square']).defaultTo('rounded')
      table.enum('card_style', ['elevated', 'bordered', 'flat']).defaultTo('elevated')

      table.string('tagline').nullable()
      table.text('about_text').nullable()
      table.json('gallery_images').nullable()
      table.json('social_links').nullable()

      table.boolean('show_gallery').defaultTo(true)
      table.boolean('show_about').defaultTo(true)
      table.boolean('show_testimonials').defaultTo(false)

      table.text('custom_css').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}