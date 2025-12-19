import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import env from '#start/env'
import Business from '#models/business'
import Booking from '#models/booking'
import User from '#models/user'
import Availability from '#models/availability'
import TimeOff from '#models/time-off'
import BusinessTheme from '#models/business-theme'
import { bookingValidator } from '#validators/booking-validator'
import { errors } from '@vinejs/vine'
import { randomUUID } from 'node:crypto'
import emailService from '#services/email-service'

export default class BookingController {
  async show({ params, view, response, request }: HttpContext) {
    const business = await Business.query()
      .where('slug', params.slug)
      .where('isActive', true)
      .where('isOnboarded', true)
      .preload('services', (query) => {
        query.where('isActive', true).orderBy('sortOrder').preload('staff', (staffQuery) => {
          staffQuery.where('isActive', true)
        })
      })
      .preload('availabilities', (query) => query.where('isActive', true))
      .preload('theme')
      .first()

    if (!business) {
      return response.status(404).send('Business not found')
    }

    const theme = business.theme
    const template = theme?.template || 'modern'

    const staff = await User.query()
      .where('businessId', business.id)
      .where('isActive', true)
      .where('role', 'staff')

    const services = business.services

    return view.render(`pages/book/templates/${template}`, {
      business,
      theme,
      services,
      staff,
      csrfToken: request.csrfToken,
    })
  }

  async getTimeSlots({ params, request, response }: HttpContext) {
    const { slug, serviceId } = params
    const dateStr = request.qs().date
    const staffId = request.qs().staffId

    if (!dateStr) {
      return response.badRequest({ error: 'Date is required' })
    }

    const business = await Business.query()
      .where('slug', slug)
      .where('isActive', true)
      .preload('services', (query) => query.where('id', serviceId))
      .preload('availabilities', (query) => query.where('isActive', true).whereNull('userId'))
      .first()

    if (!business || business.services.length === 0) {
      return response.notFound({ error: 'Business or service not found' })
    }

    const service = business.services[0]
    const selectedDate = DateTime.fromISO(dateStr)
    const dayOfWeek = selectedDate.weekday % 7

    let availability: Availability | undefined

    if (staffId) {
      const staffAvailability = await Availability.query()
        .where('businessId', business.id)
        .where('userId', staffId)
        .where('dayOfWeek', dayOfWeek)
        .where('isActive', true)
        .first()

      if (staffAvailability) {
        availability = staffAvailability
      } else {
        availability = business.availabilities.find((a) => a.dayOfWeek === dayOfWeek)
      }

      const existingBookings = await Booking.query()
        .where('businessId', business.id)
        .where('staffId', staffId)
        .where('date', selectedDate.toISODate()!)
        .whereNotIn('status', ['cancelled'])

      if (!availability) {
        return response.json({ slots: [], message: 'Staff not available on this day' })
      }

      const timeOffs = await this.getTimeOffsForDate(business.id, selectedDate, Number(staffId))

      const slots = this.generateTimeSlots(
        availability.startTime,
        availability.endTime,
        service.durationMinutes,
        existingBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
        selectedDate,
        timeOffs
      )

      return response.json({ slots })
    }

    availability = business.availabilities.find((a) => a.dayOfWeek === dayOfWeek)
    if (!availability) {
      return response.json({ slots: [], message: 'Closed on this day' })
    }

    const existingBookings = await Booking.query()
      .where('businessId', business.id)
      .where('date', selectedDate.toISODate()!)
      .whereNotIn('status', ['cancelled'])

    const timeOffs = await this.getTimeOffsForDate(business.id, selectedDate, null)

    const slots = this.generateTimeSlots(
      availability.startTime,
      availability.endTime,
      service.durationMinutes,
      existingBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
      selectedDate,
      timeOffs
    )

    return response.json({ slots })
  }

  private async getTimeOffsForDate(
    businessId: number,
    date: DateTime,
    staffId: number | null
  ): Promise<TimeOff[]> {
    const startOfDay = date.startOf('day')
    const endOfDay = date.endOf('day')

    const query = TimeOff.query()
      .where('businessId', businessId)
      .where('startDatetime', '<=', endOfDay.toISO()!)
      .where('endDatetime', '>=', startOfDay.toISO()!)

    if (staffId) {
      query.where((q) => {
        q.whereNull('userId').orWhere('userId', staffId)
      })
    } else {
      query.whereNull('userId')
    }

    return query
  }

  private isTimeBlockedByTimeOff(
    date: DateTime,
    timeStr: string,
    endTimeStr: string,
    timeOffs: TimeOff[]
  ): boolean {
    const [startH, startM] = timeStr.split(':').map(Number)
    const [endH, endM] = endTimeStr.split(':').map(Number)

    const slotStart = date.set({ hour: startH, minute: startM, second: 0 })
    const slotEnd = date.set({ hour: endH, minute: endM, second: 0 })

    return timeOffs.some((timeOff) => {
      return slotStart < timeOff.endDatetime && slotEnd > timeOff.startDatetime
    })
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    bookedSlots: Array<{ start: string; end: string }>,
    date?: DateTime,
    timeOffs?: TimeOff[]
  ) {
    const slots: Array<{ time: string; available: boolean }> = []
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    let currentHour = startHour
    let currentMin = startMin

    const endInMinutes = endHour * 60 + endMin

    while (currentHour * 60 + currentMin + durationMinutes <= endInMinutes) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      const slotEndMin = currentHour * 60 + currentMin + durationMinutes
      const slotEndHour = Math.floor(slotEndMin / 60)
      const slotEndMinute = slotEndMin % 60
      const slotEndStr = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`

      const isBooked = bookedSlots.some((booked) => {
        return this.timesOverlap(timeStr, slotEndStr, booked.start, booked.end)
      })

      const isBlockedByTimeOff =
        date && timeOffs && timeOffs.length > 0
          ? this.isTimeBlockedByTimeOff(date, timeStr, slotEndStr, timeOffs)
          : false

      slots.push({ time: timeStr, available: !isBooked && !isBlockedByTimeOff })

      currentMin += 30
      if (currentMin >= 60) {
        currentHour++
        currentMin -= 60
      }
    }

    return slots
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string) {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)
    return s1 < e2 && e1 > s2
  }

  async createBooking({ params, request, response, session }: HttpContext) {
    const business = await Business.query()
      .where('slug', params.slug)
      .where('isActive', true)
      .preload('services', (query) => query.where('id', params.serviceId).preload('staff'))
      .first()

    if (!business || business.services.length === 0) {
      return response.notFound({ error: 'Business or service not found' })
    }

    try {
      const data = await request.validateUsing(bookingValidator)
      const service = business.services[0]

      let assignedStaffId: number | null = data.staffId || null

      if (!assignedStaffId && service.staff.length > 0) {
        assignedStaffId = service.staff[0].id
      }

      const selectedDate = DateTime.fromISO(data.date)
      const [startHour, startMin] = data.time.split(':').map(Number)
      const endMinutes = startHour * 60 + startMin + service.durationMinutes
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

      const bookingQuery = Booking.query()
        .where('businessId', business.id)
        .where('date', selectedDate.toISODate()!)
        .whereNotIn('status', ['cancelled'])
        .where((query) => {
          query.where((q) => {
            q.where('startTime', '<', endTime).where('endTime', '>', data.time)
          })
        })

      if (assignedStaffId) {
        bookingQuery.where('staffId', assignedStaffId)
      }

      const existingBooking = await bookingQuery.first()

      if (existingBooking) {
        session.flash('error', 'This time slot is no longer available')
        return response.redirect().back()
      }

      const booking = await Booking.create({
        businessId: business.id,
        serviceId: service.id,
        staffId: assignedStaffId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        date: selectedDate,
        startTime: data.time,
        endTime: endTime,
        status: 'pending_payment',
        amount: service.price,
        paymentStatus: 'pending',
        paymentReference: randomUUID(),
      })

      return response.redirect().toRoute('book.payment', {
        slug: params.slug,
        bookingId: booking.id,
      })
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        session.flash('error', 'Please fill in all required fields')
        return response.redirect().back()
      }
      throw error
    }
  }

  async showPayment({ params, view, response }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    if (booking.paymentStatus === 'paid') {
      return response.redirect().toRoute('book.confirmation', {
        slug: params.slug,
        bookingId: booking.id,
      })
    }

    const paystackPublicKey = env.get('PAYSTACK_PUBLIC_KEY', 'pk_test_xxxxx')
    return view.render('pages/book/payment', { booking, paystackPublicKey })
  }

  async confirmBooking({ params, view, response }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    return view.render('pages/book/confirmation', { booking })
  }

  async verifyPayment({ params, request, response }: HttpContext) {
    const reference = request.qs().reference
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    const secretKey = env.get('PAYSTACK_SECRET_KEY')
    let paymentSuccess = false

    if (secretKey) {
      try {
        const paystackResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${secretKey}`,
            },
          }
        )
        const data = await paystackResponse.json()

        if (data.status && data.data.status === 'success') {
          booking.paymentStatus = 'paid'
          booking.status = 'confirmed'
          await booking.save()
          paymentSuccess = true
        }
      } catch (error) {
        console.error('Payment verification error:', error)
      }
    } else {
      booking.paymentStatus = 'paid'
      booking.status = 'confirmed'
      await booking.save()
      paymentSuccess = true
    }

    if (paymentSuccess) {
      const dateFormatted = booking.date.toFormat('EEEE, MMMM d, yyyy')

      await emailService.sendBookingConfirmation({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        businessName: booking.business.name,
        serviceName: booking.service.name,
        date: dateFormatted,
        time: `${booking.startTime} - ${booking.endTime}`,
        duration: booking.service.formattedDuration,
        amount: booking.amount,
        reference: booking.paymentReference?.substring(0, 8).toUpperCase() || '',
      })

      await emailService.sendBusinessNotification({
        businessEmail: booking.business.email,
        businessName: booking.business.name,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: booking.service.name,
        date: dateFormatted,
        time: `${booking.startTime} - ${booking.endTime}`,
        amount: booking.amount,
      })
    }

    return response.redirect().toRoute('book.confirmation', {
      slug: params.slug,
      bookingId: booking.id,
    })
  }

  async manageBooking({ params, view, response, request }: HttpContext) {
    const email = request.qs().email
    const ref = request.qs().ref

    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .preload('staff')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    if (email && booking.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return response.notFound('Booking not found')
    }

    if (ref && booking.paymentReference?.substring(0, 8).toUpperCase() !== ref.toUpperCase()) {
      return response.notFound('Booking not found')
    }

    const canCancel = this.canCancelBooking(booking)
    const canReschedule = this.canRescheduleBooking(booking)

    return view.render('pages/book/manage', { booking, canCancel, canReschedule })
  }

  private canCancelBooking(booking: Booking): boolean {
    if (booking.status !== 'confirmed') return false
    if (booking.isPast) return false

    const business = booking.business
    if (!business.cancellationHours) return true

    const bookingDateTime = booking.date.set({
      hour: Number.parseInt(booking.startTime.split(':')[0]),
      minute: Number.parseInt(booking.startTime.split(':')[1]),
    })

    const hoursUntilBooking = bookingDateTime.diff(DateTime.now(), 'hours').hours
    return hoursUntilBooking >= business.cancellationHours
  }

  private canRescheduleBooking(booking: Booking): boolean {
    return this.canCancelBooking(booking)
  }

  async cancelBooking({ params, response, session }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    if (!this.canCancelBooking(booking)) {
      session.flash('error', 'This booking cannot be cancelled')
      return response.redirect().back()
    }

    booking.status = 'cancelled'
    booking.cancelledAt = DateTime.now()
    booking.cancellationReason = 'Cancelled by customer'
    await booking.save()

    session.flash('success', 'Booking cancelled successfully')
    return response.redirect().toRoute('book.manage', {
      slug: params.slug,
      bookingId: booking.id,
    })
  }

  async showReschedule({ params, view, response, request }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business', (query) => {
        query.preload('availabilities', (q) => q.where('isActive', true))
      })
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    if (!this.canRescheduleBooking(booking)) {
      return response.redirect().toRoute('book.manage', {
        slug: params.slug,
        bookingId: booking.id,
      })
    }

    return view.render('pages/book/reschedule', { booking })
  }

  async rescheduleBooking({ params, request, response, session }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.bookingId)
      .preload('business')
      .preload('service')
      .first()

    if (!booking || booking.business.slug !== params.slug) {
      return response.notFound('Booking not found')
    }

    if (!this.canRescheduleBooking(booking)) {
      session.flash('error', 'This booking cannot be rescheduled')
      return response.redirect().back()
    }

    const newDate = request.input('date')
    const newTime = request.input('time')

    if (!newDate || !newTime) {
      session.flash('error', 'Please select a new date and time')
      return response.redirect().back()
    }

    const selectedDate = DateTime.fromISO(newDate)
    const [startHour, startMin] = newTime.split(':').map(Number)
    const endMinutes = startHour * 60 + startMin + booking.service.durationMinutes
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    const existingBooking = await Booking.query()
      .where('businessId', booking.businessId)
      .where('date', selectedDate.toISODate()!)
      .whereNot('id', booking.id)
      .whereNotIn('status', ['cancelled'])
      .where((query) => {
        query.where((q) => {
          q.where('startTime', '<', endTime).where('endTime', '>', newTime)
        })
      })
      .first()

    if (existingBooking) {
      session.flash('error', 'This time slot is no longer available')
      return response.redirect().back()
    }

    booking.date = selectedDate
    booking.startTime = newTime
    booking.endTime = endTime
    await booking.save()

    session.flash('success', 'Booking rescheduled successfully')
    return response.redirect().toRoute('book.manage', {
      slug: params.slug,
      bookingId: booking.id,
    })
  }
}
