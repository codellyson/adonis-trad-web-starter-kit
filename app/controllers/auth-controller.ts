import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Business from '#models/business'
import PasswordResetToken from '#models/password-reset-token'
import SubscriptionPlan from '#models/subscription_plan'
import { signupValidator, loginValidator, resetPasswordValidator } from '#validators/auth-validator'
import string from '@adonisjs/core/helpers/string'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import emailService from '#services/email-service'
import subscriptionService from '#services/subscription-service'
import env from '#start/env'

export default class AuthController {
  async showSignup({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async signup({ request, response, auth, session }: HttpContext) {
    try {
      const data = await request.validateUsing(signupValidator)

      // Note: We let the database handle duplicate checks via unique constraints
      // This avoids false positives from query matching issues

      let slug = string.slug(data.businessName, { lower: true })
      const existingBusiness = await Business.findBy('slug', slug)
      if (existingBusiness) {
        slug = `${slug}-${Date.now().toString(36)}`
      }

      const business = await Business.create({
        name: data.businessName,
        slug,
        email: data.email,
        phone: data.phone || null,
        category: data.category,
        isOnboarded: false,
      })

      const user = await User.create({
        businessId: business.id,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        role: 'owner',
        isActive: true,
      })

      await auth.use('web').login(user)

      // Create 7-day free trial
      await subscriptionService.createTrial(business)

      session.flash(
        'success',
        "Welcome! You have a 7-day free trial. Let's set up your booking page."
      )
      return response.redirect().toRoute('onboarding.show')
    } catch (error: any) {
      console.error('[AUTH] Signup error:', error)
      if (error instanceof errors.E_VALIDATION_ERROR) {
        const messages = error.messages.map((e: { message: string }) => e.message).join(', ')
        session.flash('error', `Validation failed: ${messages}`)
        session.flashAll()
        return response.redirect().back()
      }

      // Handle database constraint violations
      if (error.code === '23505') {
        // Unique constraint violation
        if (
          error.constraint === 'businesses_email_unique' ||
          error.constraint === 'users_email_unique' ||
          error.detail?.includes('email')
        ) {
          session.flash(
            'error',
            'An account with this email already exists. Please sign in instead.'
          )
        } else if (
          error.constraint === 'businesses_slug_unique' ||
          error.detail?.includes('slug')
        ) {
          // Retry with a different slug - this should be handled by the slug generation logic above
          // But if it still fails, show error
          session.flash(
            'error',
            'A business with this name already exists. Please choose a different business name.'
          )
        } else {
          session.flash(
            'error',
            'This information is already in use. Please use different details.'
          )
        }
        return response.redirect().back()
      }

      console.error('[AUTH] Signup error:', error)
      session.flash('error', 'An unexpected error occurred. Please try again.')
      return response.redirect().back()
    }
  }

  async showLogin({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async login({ request, response, auth, session }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(loginValidator)

      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)

      if (user.businessId) {
        const business = await Business.find(user.businessId)
        if (business && !business.isOnboarded) {
          return response.redirect().toRoute('onboarding.show')
        }
      }

      return response.redirect().toRoute('dashboard')
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        session.flash('error', 'Please enter a valid email and password')
        return response.redirect().back()
      }
      session.flash('error', 'Invalid email or password')
      return response.redirect().back()
    }
  }

  async logout({ response, auth, session }: HttpContext) {
    await auth.use('web').logout()
    session.flash('success', 'You have been logged out')
    return response.redirect().toRoute('auth.login.show')
  }

  async showForgotPassword({ view }: HttpContext) {
    return view.render('pages/auth/forgot-password')
  }

  async forgotPassword({ request, response, session }: HttpContext) {
    const email = request.input('email')?.toLowerCase().trim()

    if (!email) {
      session.flash('error', 'Please enter your email address')
      return response.redirect().back()
    }

    const user = await User.findBy('email', email)

    if (user) {
      await PasswordResetToken.query().where('email', email).delete()

      const token = randomBytes(32).toString('hex')
      const expiresAt = DateTime.now().plus({ hours: 1 })

      await PasswordResetToken.create({
        email,
        token,
        expiresAt,
      })

      const appUrl = env.get('APP_URL', 'http://localhost:3333')
      const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

      await emailService.sendPasswordReset({
        email,
        name: user.fullName,
        resetUrl,
      })
    }

    session.flash(
      'success',
      'If an account exists with this email, you will receive a password reset link shortly.'
    )
    return response.redirect().back()
  }

  async showResetPassword({ request, view, response, session }: HttpContext) {
    const token = request.qs().token
    const email = request.qs().email

    if (!token || !email) {
      session.flash('error', 'Invalid password reset link')
      return response.redirect().toRoute('auth.forgot.show')
    }

    const resetToken = await PasswordResetToken.query()
      .where('email', email)
      .where('token', token)
      .first()

    if (!resetToken || resetToken.isExpired) {
      session.flash('error', 'This password reset link has expired. Please request a new one.')
      return response.redirect().toRoute('auth.forgot.show')
    }

    return view.render('pages/auth/reset-password', { token, email })
  }

  async resetPassword({ request, response, session }: HttpContext) {
    try {
      const data = await request.validateUsing(resetPasswordValidator)

      const resetToken = await PasswordResetToken.query()
        .where('email', data.email)
        .where('token', data.token)
        .first()

      if (!resetToken || resetToken.isExpired) {
        session.flash('error', 'This password reset link has expired. Please request a new one.')
        return response.redirect().toRoute('auth.forgot.show')
      }

      const user = await User.findBy('email', data.email)
      if (!user) {
        session.flash('error', 'User not found')
        return response.redirect().toRoute('auth.forgot.show')
      }

      user.password = data.password
      await user.save()

      await PasswordResetToken.query().where('email', data.email).delete()

      session.flash('success', 'Your password has been reset successfully. You can now login.')
      return response.redirect().toRoute('auth.login.show')
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        const messages = error.messages.map((e: { message: string }) => e.message).join(', ')
        session.flash('error', `Validation failed: ${messages}`)
        return response.redirect().back()
      }
      session.flash('error', 'An error occurred. Please try again.')
      return response.redirect().back()
    }
  }
}
