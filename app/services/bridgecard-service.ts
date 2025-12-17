import env from '#start/env'
import crypto from 'node:crypto'

interface BridgecardCardholderResponse {
  status: string
  message: string
  data: {
    cardholder_id: string
    first_name: string
    last_name: string
    is_id_verified: boolean
    is_active: boolean
  }
}

interface BridgecardCardResponse {
  status: string
  message: string
  data: {
    card_id: string
    cardholder_id: string
    brand: string
    currency: string
    card_type: string
    is_active: boolean
    livemode: boolean
    created_at: string
    meta_data: Record<string, unknown>
  }
}

interface BridgecardCardDetailsResponse {
  status: string
  message: string
  data: {
    card_id: string
    card_number: string
    cvv: string
    expiry_month: string
    expiry_year: string
  }
}

interface BridgecardErrorResponse {
  status: string
  message: string
}

export interface CreateCardResult {
  success: boolean
  cardId?: string
  cardNumber?: string
  cvv?: string
  expiryMonth?: string
  expiryYear?: string
  brand?: string
  billingAddress?: {
    address: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  error?: string
}

export interface CardActionResult {
  success: boolean
  error?: string
}

export default class BridgecardService {
  private baseUrl: string
  private apiKey: string
  private secretKey: string
  private useMock: boolean
  private isSandbox: boolean

  constructor() {
    this.baseUrl = env.get('BRIDGECARD_BASE_URL') || 'https://issuecards.api.bridgecard.co'
    this.apiKey = env.get('BRIDGECARD_API_KEY') || ''
    this.secretKey = env.get('BRIDGECARD_SECRET_KEY') || ''

    const nodeEnv = env.get('NODE_ENV')
    this.useMock = nodeEnv === 'development' || !this.apiKey
    this.isSandbox = this.baseUrl.includes('sandbox') || nodeEnv !== 'production'
  }

  private getEndpointPath(endpoint: string): string {
    const sandboxPrefix = this.isSandbox ? '/sandbox' : ''
    return `/v1/issuing${sandboxPrefix}${endpoint}`
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        token: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok || data.status === 'error') {
      throw new Error((data as BridgecardErrorResponse).message || 'Request failed')
    }

    return data as T
  }

  private encryptPin(pin: string): string {
    const key = crypto.createHash('sha256').update(this.secretKey).digest()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(pin, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    return iv.toString('base64') + ':' + encrypted
  }

  private generateMockCardNumber(): string {
    const prefix = '4532'
    let number = prefix
    for (let i = 0; i < 12; i++) {
      number += Math.floor(Math.random() * 10)
    }
    return number
  }

  private mockCreateCard(cardholderName: string): CreateCardResult {
    console.log('[MOCK BRIDGECARD] Creating card for:', cardholderName)

    const cardNumber = this.generateMockCardNumber()
    const cvv = Math.floor(100 + Math.random() * 900).toString()
    const currentYear = new Date().getFullYear()
    const expiryYear = (currentYear + 3).toString()
    const expiryMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')

    return {
      success: true,
      cardId: `mock-card-${Date.now()}`,
      cardNumber,
      cvv,
      expiryMonth,
      expiryYear,
      brand: 'Visa',
      billingAddress: {
        address: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
      },
    }
  }

  async registerCardholder(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    bvn: string,
    address: {
      address: string
      city: string
      state: string
      postalCode: string
    }
  ): Promise<{ success: boolean; cardholderId?: string; error?: string }> {
    if (this.useMock) {
      console.log('[MOCK BRIDGECARD] Registering cardholder:', firstName, lastName)
      return { success: true, cardholderId: `mock-holder-${Date.now()}` }
    }

    try {
      const response = await this.makeRequest<BridgecardCardholderResponse>(
        this.getEndpointPath('/cardholder/register_cardholder_synchronously'),
        'POST',
        {
          first_name: firstName,
          last_name: lastName,
          email_address: email,
          phone,
          address: {
            address: address.address,
            city: address.city,
            state: address.state,
            country: 'Nigeria',
            postal_code: address.postalCode,
            house_no: '1',
          },
          identity: {
            id_type: 'NIGERIAN_BVN_VERIFICATION',
            bvn,
          },
        }
      )

      return {
        success: true,
        cardholderId: response.data.cardholder_id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register cardholder',
      }
    }
  }

  async createCard(
    cardholderName: string,
    email: string,
    phone: string,
    bvn: string,
    currency: 'NGN' | 'USD' = 'NGN'
  ): Promise<CreateCardResult> {
    console.log('[BRIDGECARD] createCard called, useMock:', this.useMock)

    if (this.useMock) {
      return this.mockCreateCard(cardholderName)
    }

    try {
      const nameParts = cardholderName.split(' ')
      const firstName = nameParts[0] || 'Customer'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const holderResult = await this.registerCardholder(firstName, lastName, email, phone, bvn, {
        address: '1 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '100001',
      })

      if (!holderResult.success) {
        return { success: false, error: holderResult.error }
      }

      const defaultPin = '1234'
      const encryptedPin = this.encryptPin(defaultPin)

      const cardResponse = await this.makeRequest<BridgecardCardResponse>(
        this.getEndpointPath('/cards/create_card'),
        'POST',
        {
          cardholder_id: holderResult.cardholderId,
          card_currency: currency,
          card_type: 'virtual',
          card_pin: encryptedPin,
        }
      )

      const relayUrl = this.isSandbox
        ? 'https://issuecards-api-bridgecard-co.relay.evervault.com/v1/issuing/sandbox/cards/get_card_details'
        : 'https://issuecards-api-bridgecard-co.relay.evervault.com/v1/issuing/cards/get_card_details'

      const detailsResponse = await fetch(`${relayUrl}?card_id=${cardResponse.data.card_id}`, {
        headers: {
          token: `Bearer ${this.apiKey}`,
        },
      })

      const detailsData = (await detailsResponse.json()) as BridgecardCardDetailsResponse

      return {
        success: true,
        cardId: cardResponse.data.card_id,
        cardNumber: detailsData.data.card_number,
        cvv: detailsData.data.cvv,
        expiryMonth: detailsData.data.expiry_month,
        expiryYear: detailsData.data.expiry_year,
        brand: cardResponse.data.brand || 'Visa',
        billingAddress: {
          address: '1 Test Street',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          postalCode: '100001',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create card',
      }
    }
  }

  async freezeCard(cardId: string): Promise<CardActionResult> {
    console.log('[BRIDGECARD] freezeCard called, useMock:', this.useMock)

    if (this.useMock) {
      console.log('[MOCK BRIDGECARD] Freezing card:', cardId)
      return { success: true }
    }

    try {
      await this.makeRequest(this.getEndpointPath(`/cards/freeze_card?card_id=${cardId}`), 'PATCH')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to freeze card',
      }
    }
  }

  async unfreezeCard(cardId: string): Promise<CardActionResult> {
    console.log('[BRIDGECARD] unfreezeCard called, useMock:', this.useMock)

    if (this.useMock) {
      console.log('[MOCK BRIDGECARD] Unfreezing card:', cardId)
      return { success: true }
    }

    try {
      await this.makeRequest(
        this.getEndpointPath(`/cards/unfreeze_card?card_id=${cardId}`),
        'PATCH'
      )
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unfreeze card',
      }
    }
  }

  async terminateCard(cardId: string): Promise<CardActionResult> {
    console.log('[BRIDGECARD] terminateCard called, useMock:', this.useMock)

    if (this.useMock) {
      console.log('[MOCK BRIDGECARD] Terminating card:', cardId)
      return { success: true }
    }

    try {
      await this.makeRequest(this.getEndpointPath(`/cards/delete_card?card_id=${cardId}`), 'DELETE')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to terminate card',
      }
    }
  }

  async fundCard(cardId: string, amount: number): Promise<CardActionResult> {
    console.log('[BRIDGECARD] fundCard called, useMock:', this.useMock)

    if (this.useMock) {
      console.log('[MOCK BRIDGECARD] Funding card:', cardId, 'amount:', amount)
      return { success: true }
    }

    try {
      await this.makeRequest(this.getEndpointPath('/cards/fund_card'), 'POST', {
        card_id: cardId,
        amount: amount * 100,
        currency: 'NGN',
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fund card',
      }
    }
  }
}
