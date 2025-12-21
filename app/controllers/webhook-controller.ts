import type { HttpContext } from '@adonisjs/core/http'
import { createHmac } from 'node:crypto'
import env from '#start/env'
import Booking from '#models/booking'
import Transaction from '#models/transaction'
import emailService from '#services/email-service'
import subscriptionService from '#services/subscription-service'

export default class WebhookController {
  async paystack({ request, response }: HttpContext) {
    const secretKey = env.get('PAYSTACK_SECRET_KEY')

    if (!secretKey) {
      console.error('[WEBHOOK] PAYSTACK_SECRET_KEY not configured')
      return response.status(500).send('Server configuration error')
    }

    const signature = request.header('x-paystack-signature')
    const rawBody = request.raw()

    if (!signature || !rawBody) {
      return response.status(400).send('Invalid request')
    }

    const expectedSignature = createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('[WEBHOOK] Invalid Paystack signature')
      return response.status(401).send('Invalid signature')
    }

    const payload = request.body()
    const event = payload.event
    const data = payload.data

    console.log(`[WEBHOOK] Received event: ${event}`)

    try {
      switch (event) {
        case 'charge.success':
          await this.handleChargeSuccess(data)
          break
        case 'charge.failed':
          await this.handleChargeFailed(data)
          break
        case 'refund.processed':
          await this.handleRefund(data)
          break
        case 'subscription.create':
        case 'subscription.enable':
        case 'subscription.disable':
        case 'invoice.payment_failed':
        case 'invoice.payment_succeeded':
          await subscriptionService.handleWebhook(event, data)
          break
        default:
          console.log(`[WEBHOOK] Unhandled event: ${event}`)
      }
    } catch (error) {
      console.error(`[WEBHOOK] Error processing ${event}:`, error)
      return response.status(500).send('Processing error')
    }

    return response.status(200).send('OK')
  }

  private async handleChargeSuccess(data: Record<string, unknown>) {
    const reference = data.reference as string
    const metadata = data.metadata as Record<string, unknown> | undefined

    let booking: Booking | null = null

    if (metadata?.booking_id) {
      booking = await Booking.query()
        .where('id', metadata.booking_id as number)
        .preload('business')
        .preload('service')
        .first()
    }

    if (!booking) {
      booking = await Booking.query()
        .whereILike('paymentReference', `%${reference}%`)
        .preload('business')
        .preload('service')
        .first()
    }

    if (!booking) {
      console.log(`[WEBHOOK] No booking found for reference: ${reference}`)
      return
    }

    if (booking.paymentStatus === 'paid') {
      console.log(`[WEBHOOK] Booking #${booking.id} already paid`)
      return
    }

    booking.paymentStatus = 'paid'
    booking.status = 'confirmed'
    await booking.save()

    const amount = (data.amount as number) / 100
    const platformFee = Math.round(amount * 0.025)

    const existingTransaction = await Transaction.query()
      .where('bookingId', booking.id)
      .where('status', 'success')
      .first()

    if (!existingTransaction) {
      await Transaction.create({
        businessId: booking.businessId,
        bookingId: booking.id,
        amount,
        platformFee,
        businessAmount: amount - platformFee,
        status: 'success',
        provider: 'paystack',
        reference: booking.paymentReference || reference,
        providerReference: reference,
      })
    }

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

    console.log(`[WEBHOOK] Booking #${booking.id} confirmed via webhook`)
  }

  private async handleChargeFailed(data: Record<string, unknown>) {
    const reference = data.reference as string
    const metadata = data.metadata as Record<string, unknown> | undefined

    let booking: Booking | null = null

    if (metadata?.booking_id) {
      booking = await Booking.find(metadata.booking_id as number)
    }

    if (!booking) {
      booking = await Booking.query()
        .whereILike('paymentReference', `%${reference}%`)
        .first()
    }

    if (!booking) {
      console.log(`[WEBHOOK] No booking found for failed charge: ${reference}`)
      return
    }

    await Transaction.create({
      businessId: booking.businessId,
      bookingId: booking.id,
      amount: (data.amount as number) / 100,
      platformFee: 0,
      businessAmount: 0,
      status: 'failed',
      provider: 'paystack',
      reference: booking.paymentReference || reference,
      providerReference: reference,
    })

    console.log(`[WEBHOOK] Recorded failed charge for booking #${booking.id}`)
  }

  private async handleRefund(data: Record<string, unknown>) {
    const transactionRef = data.transaction_reference as string

    const transaction = await Transaction.query()
      .where('providerReference', transactionRef)
      .first()

    if (!transaction) {
      console.log(`[WEBHOOK] No transaction found for refund: ${transactionRef}`)
      return
    }

    transaction.status = 'refunded'
    await transaction.save()

    if (transaction.bookingId) {
      const booking = await Booking.find(transaction.bookingId)
      if (booking) {
        booking.paymentStatus = 'refunded'
        booking.status = 'cancelled'
        await booking.save()
      }
    }

    console.log(`[WEBHOOK] Processed refund for transaction #${transaction.id}`)
  }
}

