import type { HttpContext } from '@adonisjs/core/http'
import Card from '#models/card'
import Subscription from '#models/subscription'
import Transaction from '#models/transaction'
import BridgecardService from '#services/bridgecard-service'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const CARD_CREATION_FEE = 500

export default class CardController {
  async index({ view, auth }: HttpContext) {
    const user = auth.user!

    const cards = await Card.query()
      .where('userId', user.id)
      .where('status', '!=', 'terminated')
      .orderBy('createdAt', 'desc')

    const subscriptions = await Subscription.query()
      .where('userId', user.id)
      .whereIn('status', ['active', 'ready'])
      .preload('card')
      .orderBy('nextBillingDate', 'asc')

    const upcomingRenewals = subscriptions.filter((sub) => {
      if (!sub.nextBillingDate) return false
      const daysUntilRenewal = sub.nextBillingDate.diff(DateTime.now(), 'days').days
      return daysUntilRenewal <= 7 && daysUntilRenewal >= 0
    })

    const totalUpcomingAmount = upcomingRenewals.reduce((sum, sub) => sum + Number(sub.amount), 0)
    const isLowFunds = Number(user.walletBalance) < totalUpcomingAmount && totalUpcomingAmount > 0

    const allActiveAmount = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0)
    const fundingNeeded = Math.max(0, allActiveAmount - Number(user.walletBalance))

    return view.render('pages/dashboard', {
      cards,
      subscriptions,
      upcomingRenewals,
      isLowFunds,
      totalUpcomingAmount,
      fundingNeeded,
    })
  }

  async showCreate({ view, auth, response, session }: HttpContext) {
    const user = auth.user!

    if (user.kycStatus !== 'verified') {
      session.flash('error', 'Please complete KYC verification first')
      return response.redirect().toRoute('kyc.show')
    }

    return view.render('pages/card-create')
  }

  async create({ auth, response, session }: HttpContext) {
    const user = auth.user!

    if (user.kycStatus !== 'verified') {
      session.flash('error', 'Please complete KYC verification first')
      return response.redirect().toRoute('kyc.show')
    }

    if (Number(user.walletBalance) < CARD_CREATION_FEE) {
      session.flash('error', `Insufficient balance. Card creation requires ₦${CARD_CREATION_FEE}`)
      return response.redirect().toRoute('wallet.fund')
    }

    const bridgecardService = new BridgecardService()

    const result = await bridgecardService.createCard(
      user.fullName || 'Customer',
      user.email,
      user.phone || '',
      user.bvn || ''
    )

    if (!result.success) {
      session.flash('error', result.error || 'Failed to create card')
      return response.redirect().back()
    }

    const card = await Card.create({
      userId: user.id,
      bridgecardId: result.cardId!,
      cardPan: result.cardNumber!,
      lastFour: result.cardNumber!.slice(-4),
      cvv: result.cvv!,
      expiryMonth: result.expiryMonth!,
      expiryYear: result.expiryYear!,
      brand: result.brand || 'Visa',
      currency: 'NGN',
      status: 'active',
      billingAddress: result.billingAddress?.address,
      billingCity: result.billingAddress?.city,
      billingState: result.billingAddress?.state,
      billingCountry: result.billingAddress?.country || 'Nigeria',
      billingZip: result.billingAddress?.postalCode,
    })

    user.walletBalance = Number(user.walletBalance) - CARD_CREATION_FEE
    await user.save()

    await Transaction.create({
      userId: user.id,
      type: 'debit',
      amount: CARD_CREATION_FEE,
      description: 'Card Creation Fee',
      reference: `CARD-FEE-${randomUUID()}`,
      status: 'completed',
      metadata: { cardId: card.id },
    })

    session.flash('success', 'Virtual card created successfully!')
    return response.redirect().toRoute('cards.show', { id: card.id })
  }

  async show({ view, auth, params, response }: HttpContext) {
    const card = await Card.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()

    if (!card) {
      return response.redirect().toRoute('dashboard')
    }

    return view.render('pages/card-detail', { card })
  }

  async freeze({ auth, params, response, session }: HttpContext) {
    const card = await Card.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()

    if (!card) {
      session.flash('error', 'Card not found')
      return response.redirect().toRoute('dashboard')
    }

    const bridgecardService = new BridgecardService()
    const result = await bridgecardService.freezeCard(card.bridgecardId)

    if (result.success) {
      card.status = 'frozen'
      await card.save()
      session.flash('success', 'Card frozen successfully')
    } else {
      session.flash('error', result.error || 'Failed to freeze card')
    }

    return response.redirect().toRoute('cards.show', { id: card.id })
  }

  async unfreeze({ auth, params, response, session }: HttpContext) {
    const card = await Card.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()

    if (!card) {
      session.flash('error', 'Card not found')
      return response.redirect().toRoute('dashboard')
    }

    const bridgecardService = new BridgecardService()
    const result = await bridgecardService.unfreezeCard(card.bridgecardId)

    if (result.success) {
      card.status = 'active'
      await card.save()
      session.flash('success', 'Card unfrozen successfully')
    } else {
      session.flash('error', result.error || 'Failed to unfreeze card')
    }

    return response.redirect().toRoute('cards.show', { id: card.id })
  }

  async delete({ auth, params, response, session }: HttpContext) {
    const card = await Card.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()

    if (!card) {
      session.flash('error', 'Card not found')
      return response.redirect().toRoute('dashboard')
    }

    const bridgecardService = new BridgecardService()
    const result = await bridgecardService.terminateCard(card.bridgecardId)

    if (result.success) {
      card.status = 'terminated'
      await card.save()
      session.flash('success', 'Card deleted successfully')
    } else {
      session.flash('error', result.error || 'Failed to delete card')
    }

    return response.redirect().toRoute('dashboard')
  }
}
