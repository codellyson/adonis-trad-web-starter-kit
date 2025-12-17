import type { HttpContext } from '@adonisjs/core/http'
import Transaction from '#models/transaction'
import User from '#models/user'
import PaystackService from '#services/paystack-service'
import { randomUUID } from 'node:crypto'

interface PaystackWebhookPayload {
  event: string
  data: {
    id: number
    domain: string
    amount: number
    currency: string
    reference: string
    source: string
    reason: string
    status: string
    transfer_code: string
    customer: {
      id: number
      email: string
      customer_code: string
    }
    dedicated_account: {
      account_number: string
      bank_name: string
    }
    created_at: string
  }
}

export default class WalletController {
  async show({ view, auth }: HttpContext) {
    const transactions = await Transaction.query()
      .where('userId', auth.user!.id)
      .orderBy('createdAt', 'desc')
      .limit(20)

    return view.render('pages/fund-wallet', { transactions })
  }

  async transactions({ view, auth }: HttpContext) {
    const transactions = await Transaction.query()
      .where('userId', auth.user!.id)
      .orderBy('createdAt', 'desc')

    return view.render('pages/transactions', { transactions })
  }

  async createVirtualAccount({ auth, response, session }: HttpContext) {
    const user = auth.user!

    if (user.virtualAccountNumber) {
      session.flash('error', 'You already have a virtual account')
      return response.redirect().back()
    }

    if (!user.bvn) {
      session.flash('error', 'Please complete KYC verification first')
      return response.redirect().toRoute('kyc.show')
    }

    const paystackService = new PaystackService()

    const result = await paystackService.createDedicatedVirtualAccount(
      user.fullName || 'Customer',
      user.email,
      user.phone || '',
      user.bvn
    )

    if (result.success) {
      user.virtualAccountNumber = result.accountNumber!
      user.virtualAccountBank = result.bankName!
      user.virtualAccountName = result.accountName!
      await user.save()

      session.flash('success', 'Virtual account created successfully!')
      return response.redirect().toRoute('wallet.fund')
    }

    session.flash('error', result.error || 'Failed to create virtual account')
    return response.redirect().back()
  }

  async webhook({ request, response }: HttpContext) {
    const signature = request.header('x-paystack-signature')
    const payload = request.raw() || ''

    const paystackService = new PaystackService()

    if (!signature || !paystackService.verifyWebhookSignature(payload, signature)) {
      return response.status(401).json({ error: 'Invalid signature' })
    }

    const body = request.body() as PaystackWebhookPayload

    if (body.event === 'charge.success' && body.data.dedicated_account) {
      const accountNumber = body.data.dedicated_account.account_number
      const amountInNaira = body.data.amount / 100

      const user = await User.findBy('virtualAccountNumber', accountNumber)

      if (user) {
        const existingTransaction = await Transaction.findBy('reference', body.data.reference)

        if (!existingTransaction) {
          await Transaction.create({
            userId: user.id,
            type: 'credit',
            amount: amountInNaira,
            description: 'Wallet Top-up',
            reference: body.data.reference,
            status: 'completed',
            metadata: {
              source: body.data.source,
              paystackId: body.data.id,
              createdAt: body.data.created_at,
            },
          })

          user.walletBalance = Number(user.walletBalance) + amountInNaira
          await user.save()
        }
      }
    }

    return response.json({ status: 'ok' })
  }
}
