import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Transaction from '#models/transaction'
import { randomUUID } from 'node:crypto'

export default class DevController {
  async simulateFunding({ request, response, auth, session }: HttpContext) {
    if (env.get('NODE_ENV') !== 'development') {
      return response.status(403).json({ error: 'Only available in development' })
    }

    const amount = Number(request.input('amount', 1000))

    if (amount <= 0 || amount > 100000) {
      session.flash('error', 'Amount must be between 1 and 100,000')
      return response.redirect().back()
    }

    const user = auth.user!

    await Transaction.create({
      userId: user.id,
      type: 'credit',
      amount,
      description: '[TEST] Simulated Wallet Top-up',
      reference: `TEST-${randomUUID()}`,
      status: 'completed',
      metadata: { simulated: true },
    })

    user.walletBalance = Number(user.walletBalance) + amount
    await user.save()

    session.flash('success', `[TEST] Added ₦${amount.toLocaleString()} to your wallet`)
    return response.redirect().back()
  }
}
