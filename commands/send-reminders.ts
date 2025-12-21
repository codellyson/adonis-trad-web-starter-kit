import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import emailService from '#services/email-service'
import env from '#start/env'

export default class SendReminders extends BaseCommand {
  static commandName = 'reminders:send'
  static description = 'Send email reminders for upcoming bookings'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Checking for bookings that need reminders...')

    const now = DateTime.now()

    const reminders24h = await this.getBookingsFor24hReminder(now)
    const reminders1h = await this.getBookingsFor1hReminder(now)

    this.logger.info(`Found ${reminders24h.length} bookings for 24h reminder`)
    this.logger.info(`Found ${reminders1h.length} bookings for 1h reminder`)

    let sent24h = 0
    let sent1h = 0

    for (const booking of reminders24h) {
      const success = await this.sendReminder(booking, '24h')
      if (success) {
        booking.reminder24hSentAt = DateTime.now()
        await booking.save()
        sent24h++
      }
    }

    for (const booking of reminders1h) {
      const success = await this.sendReminder(booking, '1h')
      if (success) {
        booking.reminder1hSentAt = DateTime.now()
        await booking.save()
        sent1h++
      }
    }

    this.logger.success(`Reminders sent: ${sent24h} (24h), ${sent1h} (1h)`)
  }

  private async getBookingsFor24hReminder(now: DateTime): Promise<Booking[]> {
    const tomorrow = now.plus({ hours: 24 }).startOf('day')
    const tomorrowEnd = now.plus({ hours: 25 }).startOf('day')

    return Booking.query()
      .where('status', 'confirmed')
      .where('paymentStatus', 'paid')
      .whereNull('reminder_24h_sent_at')
      .where('date', '>=', tomorrow.toISODate()!)
      .where('date', '<=', tomorrowEnd.toISODate()!)
      .preload('business')
      .preload('service')
      .preload('staff')
  }

  private async getBookingsFor1hReminder(now: DateTime): Promise<Booking[]> {
    const today = now.toISODate()!
    const currentHour = now.hour
    const targetHourStart = currentHour + 1
    const targetHourEnd = currentHour + 2

    const bookings = await Booking.query()
      .where('status', 'confirmed')
      .where('paymentStatus', 'paid')
      .whereNull('reminder_1h_sent_at')
      .where('date', today)
      .preload('business')
      .preload('service')
      .preload('staff')

    return bookings.filter((booking) => {
      const [hour] = booking.startTime.split(':').map(Number)
      return hour >= targetHourStart && hour < targetHourEnd
    })
  }

  private async sendReminder(booking: Booking, type: '24h' | '1h'): Promise<boolean> {
    const dateFormatted = booking.date.toFormat('EEEE, MMMM d, yyyy')
    const appUrl = env.get('APP_URL', 'http://localhost:3333')
    const manageUrl = `${appUrl}/book/${booking.business.slug}/booking/${booking.id}/manage`

    try {
      await emailService.sendBookingReminder({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        businessName: booking.business.name,
        serviceName: booking.service.name,
        date: dateFormatted,
        time: `${booking.startTime} - ${booking.endTime}`,
        staffName: booking.staff?.fullName,
        reminderType: type,
        manageUrl,
      })
      this.logger.info(
        `Sent ${type} reminder for booking #${booking.id} to ${booking.customerEmail}`
      )
      return true
    } catch (error) {
      this.logger.error(`Failed to send reminder for booking #${booking.id}: ${error}`)
      return false
    }
  }
}
