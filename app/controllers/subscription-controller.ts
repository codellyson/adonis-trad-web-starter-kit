import type { HttpContext } from '@adonisjs/core/http'
import Card from '#models/card'
import Subscription from '#models/subscription'
import Transaction from '#models/transaction'
import BridgecardService from '#services/bridgecard-service'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export const AVAILABLE_SERVICES = [
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    description: 'Ad-free videos, background play, downloads, and YouTube Music included',
    icon: 'youtube',
    color: 'red',
    signupUrl: 'https://www.youtube.com/premium',
    plans: [
      { id: 'individual', name: 'Individual', price: 1100, period: 'month' },
      { id: 'family', name: 'Family (up to 6)', price: 2200, period: 'month' },
      { id: 'student', name: 'Student', price: 700, period: 'month' },
    ],
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    description: 'Ad-free music streaming, background play, and offline downloads',
    icon: 'youtube-music',
    color: 'red',
    signupUrl: 'https://music.youtube.com/music_premium',
    plans: [
      { id: 'individual', name: 'Individual', price: 900, period: 'month' },
      { id: 'family', name: 'Family (up to 6)', price: 1400, period: 'month' },
      { id: 'student', name: 'Student', price: 550, period: 'month' },
    ],
  },
]

const SERVICE_FEE = 200

export default class SubscriptionController {
  async index({ view, auth }: HttpContext) {
    const subscriptions = await Subscription.query()
      .where('userId', auth.user!.id)
      .whereNot('status', 'cancelled')
      .preload('card')
      .orderBy('createdAt', 'desc')

    return view.render('pages/subscriptions/index', {
      services: AVAILABLE_SERVICES,
      subscriptions,
    })
  }

  async show({ view, params, auth }: HttpContext) {
    const service = AVAILABLE_SERVICES.find((s) => s.id === params.id)

    if (!service) {
      return view.render('pages/errors/not_found')
    }

    const cards = await Card.query()
      .where('userId', auth.user!.id)
      .where('status', 'active')
      .orderBy('createdAt', 'desc')

    const existingSubscription = await Subscription.query()
      .where('userId', auth.user!.id)
      .where('serviceId', service.id)
      .whereNot('status', 'cancelled')
      .first()

    return view.render('pages/subscriptions/show', {
      service,
      cards,
      existingSubscription,
    })
  }

  async subscribe({ request, response, auth, session, params }: HttpContext) {
    const user = auth.user!
    const service = AVAILABLE_SERVICES.find((s) => s.id === params.id)

    if (!service) {
      session.flash('error', 'Service not found')
      return response.redirect().back()
    }

    const planId = request.input('plan_id')
    const cardId = request.input('card_id')

    const plan = service.plans.find((p) => p.id === planId)

    if (!plan) {
      session.flash('error', 'Invalid plan selected')
      return response.redirect().back()
    }

    const card = await Card.query()
      .where('id', cardId)
      .where('userId', user.id)
      .where('status', 'active')
      .first()

    if (!card) {
      session.flash('error', 'Please select a valid active card')
      return response.redirect().back()
    }

    const totalAmount = plan.price + SERVICE_FEE

    if (Number(user.walletBalance) < totalAmount) {
      session.flash(
        'error',
        `Insufficient balance. You need ₦${totalAmount.toLocaleString()} (₦${plan.price.toLocaleString()} + ₦${SERVICE_FEE} service fee)`
      )
      return response.redirect().toRoute('wallet.fund')
    }

    const existingSubscription = await Subscription.query()
      .where('userId', user.id)
      .where('serviceId', service.id)
      .whereIn('status', ['active', 'pending', 'ready'])
      .first()

    if (existingSubscription) {
      session.flash('error', 'You already have an active subscription to this service')
      return response.redirect().back()
    }

    const bridgecardService = new BridgecardService()
    const fundResult = await bridgecardService.fundCard(card.bridgecardId, plan.price)

    if (!fundResult.success) {
      session.flash('error', `Failed to fund card: ${fundResult.error}`)
      return response.redirect().back()
    }

    user.walletBalance = Number(user.walletBalance) - totalAmount
    await user.save()

    const reference = `SUB-${randomUUID()}`

    await Transaction.create({
      userId: user.id,
      type: 'debit',
      amount: totalAmount,
      description: `${service.name} - ${plan.name} Subscription + Card Funding`,
      reference,
      status: 'completed',
      metadata: {
        serviceId: service.id,
        planId: plan.id,
        cardId: card.id,
        serviceFee: SERVICE_FEE,
        subscriptionAmount: plan.price,
        cardFunded: plan.price,
      },
    })

    const subscription = await Subscription.create({
      userId: user.id,
      cardId: card.id,
      serviceId: service.id,
      serviceName: `${service.name} - ${plan.name}`,
      amount: plan.price,
      status: 'ready',
      startedAt: DateTime.now(),
      nextBillingDate: DateTime.now().plus({ months: 1 }),
      metadata: {
        planId: plan.id,
        planName: plan.name,
        signupUrl: service.signupUrl,
        cardFunded: true,
        fundedAmount: plan.price,
        transactionRef: reference,
      },
    })

    session.flash(
      'success',
      `Your card has been funded with ₦${plan.price.toLocaleString()}. Complete your subscription on YouTube using your card details.`
    )
    return response.redirect().toRoute('subscriptions.details', { id: subscription.id })
  }

  async details({ view, params, auth, response }: HttpContext) {
    const subscription = await Subscription.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .preload('card')
      .first()

    if (!subscription) {
      return response.redirect().toRoute('subscriptions.index')
    }

    const service = AVAILABLE_SERVICES.find((s) => s.id === subscription.serviceId)

    return view.render('pages/subscriptions/details', { subscription, service })
  }

  async markActive({ params, auth, response, session }: HttpContext) {
    const subscription = await Subscription.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .where('status', 'ready')
      .first()

    if (!subscription) {
      session.flash('error', 'Subscription not found or already active')
      return response.redirect().toRoute('subscriptions.index')
    }

    subscription.status = 'active'
    await subscription.save()

    session.flash('success', 'Subscription marked as active!')
    return response.redirect().toRoute('subscriptions.details', { id: subscription.id })
  }

  async cancel({ params, auth, response, session }: HttpContext) {
    const subscription = await Subscription.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()

    if (!subscription) {
      session.flash('error', 'Subscription not found')
      return response.redirect().toRoute('subscriptions.index')
    }

    subscription.status = 'cancelled'
    subscription.cancelledAt = DateTime.now()
    await subscription.save()

    session.flash('success', 'Subscription cancelled successfully')
    return response.redirect().toRoute('subscriptions.index')
  }
}
