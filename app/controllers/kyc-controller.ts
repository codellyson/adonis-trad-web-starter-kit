import type { HttpContext } from '@adonisjs/core/http'
import DojahService from '#services/dojah-service'
import { kycValidator } from '#validators/kyc-validator'

export default class KycController {
  async show({ view, auth, response }: HttpContext) {
    if (auth.user!.kycStatus === 'verified') {
      return response.redirect().toRoute('dashboard')
    }
    return view.render('pages/kyc-verification')
  }

  async verify({ request, response, auth, session }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(kycValidator)
    const dojahService = new DojahService()

    let result

    if (data.type === 'bvn' && data.bvn) {
      result = await dojahService.verifyBvn(data.bvn)
      if (result.success) {
        user.bvn = data.bvn
      }
    } else if (data.type === 'nin' && data.nin) {
      result = await dojahService.verifyNin(data.nin)
      if (result.success) {
        user.nin = data.nin
      }
    } else {
      session.flash('error', 'Please provide a valid BVN or NIN')
      return response.redirect().back()
    }

    if (result.success) {
      user.kycStatus = 'verified'
      if (result.firstName && result.lastName) {
        user.fullName = `${result.firstName} ${result.middleName || ''} ${result.lastName}`.trim()
      }
      await user.save()

      session.flash('success', 'Identity verified successfully!')
      return response.redirect().toRoute('dashboard')
    }

    user.kycStatus = 'failed'
    await user.save()

    session.flash('error', result.error || 'Verification failed. Please check your details.')
    return response.redirect().back()
  }
}
