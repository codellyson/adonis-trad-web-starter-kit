import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { signupValidator, loginValidator } from '#validators/auth-validator'

export default class AuthController {
  async showSignup({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async signup({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(signupValidator)

    const existingUser = await User.findBy('email', data.email)
    if (existingUser) {
      session.flash('error', 'An account with this email already exists')
      return response.redirect().back()
    }

    const existingPhone = await User.findBy('phone', data.phone)
    if (existingPhone) {
      session.flash('error', 'An account with this phone number already exists')
      return response.redirect().back()
    }

    await User.create({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      kycStatus: 'pending',
      walletBalance: 0,
    })

    session.flash('success', 'Account created successfully. Please login.')
    return response.redirect().toRoute('auth.login.show')
  }

  async showLogin({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async login({ request, response, auth, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      return response.redirect().toRoute('dashboard')
    } catch {
      session.flash('error', 'Invalid email or password')
      return response.redirect().back()
    }
  }

  async logout({ response, auth, session }: HttpContext) {
    await auth.use('web').logout()
    session.flash('success', 'You have been logged out')
    return response.redirect().toRoute('auth.login.show')
  }
}
