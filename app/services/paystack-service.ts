import env from '#start/env'

interface PaystackDVAResponse {
  status: boolean
  message: string
  data: {
    bank: {
      name: string
      id: number
      slug: string
    }
    account_name: string
    account_number: string
    assigned: boolean
    currency: string
    metadata: Record<string, unknown>
    active: boolean
    id: number
    created_at: string
    updated_at: string
    assignment: {
      integration: number
      assignee_id: number
      assignee_type: string
      expired: boolean
      account_type: string
      assigned_at: string
    }
    customer: {
      id: number
      first_name: string
      last_name: string
      email: string
      customer_code: string
      phone: string
      risk_action: string
    }
  }
}

interface PaystackCustomerResponse {
  status: boolean
  message: string
  data: {
    id: number
    customer_code: string
    email: string
    first_name: string
    last_name: string
    phone: string
  }
}

export interface ReservedAccountResult {
  success: boolean
  accountNumber?: string
  bankName?: string
  accountName?: string
  reference?: string
  error?: string
}

export default class PaystackService {
  private baseUrl: string
  private secretKey: string
  private useMock: boolean

  constructor() {
    this.baseUrl = 'https://api.paystack.co'
    this.secretKey = env.get('PAYSTACK_SECRET_KEY') || ''

    const nodeEnv = env.get('NODE_ENV')
    this.useMock = nodeEnv === 'development' || !this.secretKey
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Request failed')
    }

    return data as T
  }

  private async createCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<string> {
    const response = await this.makeRequest<PaystackCustomerResponse>('/customer', 'POST', {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    })

    return response.data.customer_code
  }

  private mockCreateAccount(customerName: string): ReservedAccountResult {
    console.log('[MOCK PAYSTACK] Creating virtual account for:', customerName)

    const randomAccountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString()

    return {
      success: true,
      accountNumber: randomAccountNumber,
      bankName: 'Wema Bank (Test)',
      accountName: `PAYSTACK-${customerName.toUpperCase()}`,
      reference: `mock-${Date.now()}`,
    }
  }

  async createDedicatedVirtualAccount(
    customerName: string,
    email: string,
    phone: string,
    bvn: string
  ): Promise<ReservedAccountResult> {
    console.log('[PAYSTACK] createDedicatedVirtualAccount called, useMock:', this.useMock)

    if (this.useMock) {
      return this.mockCreateAccount(customerName)
    }

    try {
      const nameParts = customerName.split(' ')
      const firstName = nameParts[0] || 'Customer'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const customerCode = await this.createCustomer(email, firstName, lastName, phone)

      const response = await this.makeRequest<PaystackDVAResponse>(
        '/dedicated_account',
        'POST',
        {
          customer: customerCode,
          preferred_bank: 'wema-bank',
          bvn,
        }
      )

      return {
        success: true,
        accountNumber: response.data.account_number,
        bankName: response.data.bank.name,
        accountName: response.data.account_name,
        reference: response.data.id.toString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create virtual account',
      }
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('node:crypto')
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex')
    return hash === signature
  }
}
