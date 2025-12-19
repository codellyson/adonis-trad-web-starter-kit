import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import emailService from '#services/email-service'

export default class SendReminders extends BaseCommand {
  static commandName = 'reminders:send'
  static description = 'Send email reminders for upcoming bookings'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Checking for bookings that need reminders...')

    const now = DateTime.now()

    const reminders24h = await this.getBookingsNeedingReminder(now, 24, 23)
    const reminders1h = await this.getBookingsNeedingReminder(now, 1, 0)

    this.logger.info(`Found ${reminders24h.length} bookings for 24h reminder`)
    this.logger.info(`Found ${reminders1h.length} bookings for 1h reminder`)

    for (const booking of reminders24h) {
      await this.sendReminder(booking, '24h')
    }

    for (const booking of reminders1h) {
      await this.sendReminder(booking, '1h')
    }

    this.logger.success('Reminders sent successfully')
  }

  private async getBookingsNeedingReminder(
    now: DateTime,
    hoursAhead: number,
    hoursMin: number
  ): Promise<Booking[]> {
    const bookings = await Booking.query()
      .where('status', 'confirmed')
      .where('paymentStatus', 'paid')
      .preload('business')
      .preload('service')
      .preload('staff')

    return bookings.filter((booking) => {
      const bookingDateTime = booking.date.set({
        hour: Number.parseInt(booking.startTime.split(':')[0]),
        minute: Number.parseInt(booking.startTime.split(':')[1]),
      })

      const hoursUntil = bookingDateTime.diff(now, 'hours').hours

      return hoursUntil <= hoursAhead && hoursUntil > hoursMin
    })
  }

  private async sendReminder(booking: Booking, type: '24h' | '1h') {
    const dateFormatted = booking.date.toFormat('EEEE, MMMM d, yyyy')
    const manageUrl = `/book/${booking.business.slug}/booking/${booking.id}/manage`

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
    } catch (error) {
      this.logger.error(`Failed to send reminder for booking #${booking.id}: ${error}`)
    }
  }
}
