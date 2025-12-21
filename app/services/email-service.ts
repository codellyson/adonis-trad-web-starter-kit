import { Resend } from 'resend'
import env from '#start/env'

interface BookingConfirmationData {
  customerName: string
  customerEmail: string
  businessName: string
  serviceName: string
  date: string
  time: string
  duration: string
  amount: number
  reference: string
  bookingUrl?: string
}

interface BusinessNotificationData {
  businessEmail: string
  businessName: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  serviceName: string
  date: string
  time: string
  amount: number
}

interface BookingReminderData {
  customerName: string
  customerEmail: string
  businessName: string
  serviceName: string
  date: string
  time: string
  staffName?: string
  reminderType: '24h' | '1h'
  manageUrl: string
}

interface PasswordResetData {
  email: string
  name: string
  resetUrl: string
}

class EmailService {
  private resend: Resend | null = null
  private fromEmail: string

  constructor() {
    const apiKey = env.get('RESEND_API_KEY')
    this.fromEmail = env.get('FROM_EMAIL', 'noreply@fastappoint.com')

    if (apiKey) {
      this.resend = new Resend(apiKey)
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationData) {
    if (!this.resend) {
      console.log('[Email Mock] Booking confirmation to:', data.customerEmail)
      console.log('[Email Mock] Data:', JSON.stringify(data, null, 2))
      return { success: true, mock: true }
    }

    try {
      const result = await this.resend.emails.send({
        from: `FastAppoint <${this.fromEmail}>`,
        to: data.customerEmail,
        subject: `Booking Confirmed - ${data.businessName}`,
        html: this.getBookingConfirmationHtml(data),
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }
  }

  async sendBusinessNotification(data: BusinessNotificationData) {
    if (!this.resend) {
      console.log('[Email Mock] Business notification to:', data.businessEmail)
      console.log('[Email Mock] Data:', JSON.stringify(data, null, 2))
      return { success: true, mock: true }
    }

    try {
      const result = await this.resend.emails.send({
        from: `FastAppoint <${this.fromEmail}>`,
        to: data.businessEmail,
        subject: `New Booking - ${data.customerName}`,
        html: this.getBusinessNotificationHtml(data),
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }
  }

  async sendBookingReminder(data: BookingReminderData) {
    if (!this.resend) {
      console.log('[Email Mock] Booking reminder to:', data.customerEmail)
      console.log('[Email Mock] Data:', JSON.stringify(data, null, 2))
      return { success: true, mock: true }
    }

    const subject =
      data.reminderType === '24h'
        ? `Reminder: Your appointment tomorrow at ${data.businessName}`
        : `Reminder: Your appointment in 1 hour at ${data.businessName}`

    try {
      const result = await this.resend.emails.send({
        from: `FastAppoint <${this.fromEmail}>`,
        to: data.customerEmail,
        subject,
        html: this.getBookingReminderHtml(data),
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }
  }

  async send(data: { to: string; subject: string; html: string }) {
    if (!this.resend) {
      console.log('[Email Mock] Sending email to:', data.to)
      console.log('[Email Mock] Subject:', data.subject)
      return { success: true, mock: true }
    }

    try {
      const result = await this.resend.emails.send({
        from: `FastAppoint <${this.fromEmail}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }
  }

  async sendPasswordReset(data: PasswordResetData) {
    if (!this.resend) {
      console.log('[Email Mock] Password reset to:', data.email)
      console.log('[Email Mock] Reset URL:', data.resetUrl)
      return { success: true, mock: true }
    }

    try {
      const result = await this.resend.emails.send({
        from: `FastAppoint <${this.fromEmail}>`,
        to: data.email,
        subject: 'Reset Your Password - FastAppoint',
        html: this.getPasswordResetHtml(data),
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }
  }

  private getPasswordResetHtml(data: PasswordResetData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f8;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #5A45FF; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #21201c; font-size: 16px; margin-bottom: 20px;">
          Hi ${data.name},
        </p>
        <p style="color: #63635e; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.resetUrl}" style="display: inline-block; background: #5A45FF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #63635e; font-size: 14px; line-height: 1.6;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #82827c; font-size: 13px; margin-top: 24px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${data.resetUrl}" style="color: #5A45FF; word-break: break-all;">${data.resetUrl}</a>
        </p>
      </div>
      <div style="background: #f9f9f8; padding: 20px; text-align: center; border-top: 1px solid #e9e8e6;">
        <p style="margin: 0; color: #82827c; font-size: 13px;">
          Powered by <a href="${env.get('APP_URL', 'https://fastappoint.com')}" style="color: #5A45FF; text-decoration: none;">FastAppoint</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  private getBookingConfirmationHtml(data: BookingConfirmationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f8;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #5A45FF; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed! ✓</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #21201c; font-size: 16px; margin-bottom: 20px;">
          Hi ${data.customerName},
        </p>
        <p style="color: #63635e; font-size: 15px; line-height: 1.6;">
          Your booking with <strong>${data.businessName}</strong> has been confirmed.
        </p>

        <div style="background: #f9f9f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Service</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Duration</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.duration}</td>
            </tr>
            <tr style="border-top: 1px solid #e9e8e6;">
              <td style="padding: 12px 0 8px; color: #21201c; font-size: 15px; font-weight: 600;">Total Paid</td>
              <td style="padding: 12px 0 8px; color: #5A45FF; font-size: 15px; text-align: right; font-weight: 600;">₦${data.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0f0ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #21201c; font-size: 14px;">
            <strong>Reference:</strong> ${data.reference}
          </p>
        </div>

        <p style="color: #63635e; font-size: 14px; line-height: 1.6;">
          Please arrive 5 minutes before your scheduled time. Need to make changes?
        </p>

        ${data.bookingUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.bookingUrl}" style="display: inline-block; background: #5A45FF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Manage Booking
          </a>
        </div>
        <p style="color: #82827c; font-size: 13px; text-align: center;">
          Reschedule or cancel your appointment online
        </p>
        ` : ''}
      </div>
      <div style="background: #f9f9f8; padding: 20px; text-align: center; border-top: 1px solid #e9e8e6;">
        <p style="margin: 0; color: #82827c; font-size: 13px;">
          Powered by <a href="${env.get('APP_URL', 'https://fastappoint.com')}" style="color: #5A45FF; text-decoration: none;">FastAppoint</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  private getBookingReminderHtml(data: BookingReminderData): string {
    const headerText =
      data.reminderType === '24h' ? 'Your appointment is tomorrow!' : 'Your appointment is in 1 hour!'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f8;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #f59e0b; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ ${headerText}</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #21201c; font-size: 16px; margin-bottom: 20px;">
          Hi ${data.customerName},
        </p>
        <p style="color: #63635e; font-size: 15px; line-height: 1.6;">
          This is a friendly reminder about your upcoming appointment at <strong>${data.businessName}</strong>.
        </p>

        <div style="background: #f9f9f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Service</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.time}</td>
            </tr>
            ${
              data.staffName
                ? `
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">With</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.staffName}</td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        <p style="color: #63635e; font-size: 14px; line-height: 1.6;">
          Please arrive 5 minutes before your scheduled time. If you need to cancel or reschedule, please do so as soon as possible.
        </p>
      </div>
      <div style="background: #f9f9f8; padding: 20px; text-align: center; border-top: 1px solid #e9e8e6;">
        <p style="margin: 0; color: #82827c; font-size: 13px;">
          Powered by <a href="${env.get('APP_URL', 'https://fastappoint.com')}" style="color: #5A45FF; text-decoration: none;">FastAppoint</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  private getBusinessNotificationHtml(data: BusinessNotificationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f8;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #10b981; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Booking! 🎉</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #21201c; font-size: 16px; margin-bottom: 20px;">
          Hi ${data.businessName},
        </p>
        <p style="color: #63635e; font-size: 15px; line-height: 1.6;">
          You have a new booking from <strong>${data.customerName}</strong>.
        </p>

        <div style="background: #f9f9f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 16px; color: #21201c; font-size: 15px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Service</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right; font-weight: 500;">${data.time}</td>
            </tr>
            <tr style="border-top: 1px solid #e9e8e6;">
              <td style="padding: 12px 0 8px; color: #21201c; font-size: 15px; font-weight: 600;">Amount</td>
              <td style="padding: 12px 0 8px; color: #10b981; font-size: 15px; text-align: right; font-weight: 600;">₦${data.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f9f9f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 16px; color: #21201c; font-size: 15px;">Customer Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Name</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Email</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right;">${data.customerEmail}</td>
            </tr>
            ${
              data.customerPhone
                ? `
            <tr>
              <td style="padding: 8px 0; color: #63635e; font-size: 14px;">Phone</td>
              <td style="padding: 8px 0; color: #21201c; font-size: 14px; text-align: right;">${data.customerPhone}</td>
            </tr>
            `
                : ''
            }
          </table>
        </div>
      </div>
      <div style="background: #f9f9f8; padding: 20px; text-align: center; border-top: 1px solid #e9e8e6;">
        <p style="margin: 0; color: #82827c; font-size: 13px;">
          Powered by <a href="${env.get('APP_URL', 'https://fastappoint.com')}" style="color: #5A45FF; text-decoration: none;">FastAppoint</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }
}

export default new EmailService()
