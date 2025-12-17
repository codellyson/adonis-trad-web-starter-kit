import env from '#start/env'

interface DojahBvnResponse {
  entity: {
    bvn: string
    first_name: string
    last_name: string
    middle_name: string
    date_of_birth: string
    phone_number1: string
    phone_number2: string
    gender: string
    enrollment_bank: string
    enrollment_branch: string
    level_of_account: string
    lga_of_origin: string
    lga_of_residence: string
    marital_status: string
    nationality: string
    residential_address: string
    state_of_origin: string
    state_of_residence: string
    watch_listed: string
    image: string
  }
}

interface DojahNinResponse {
  entity: {
    nin: string
    first_name: string
    last_name: string
    middle_name: string
    date_of_birth: string
    phone_number: string
    gender: string
    photo: string
    residence_address: string
    residence_state: string
    residence_lga: string
  }
}

interface DojahErrorResponse {
  error: {
    message: string
    code: string
  }
}

export interface KycVerificationResult {
  success: boolean
  firstName?: string
  lastName?: string
  middleName?: string
  phoneNumber?: string
  dateOfBirth?: string
  error?: string
}

export default class DojahService {
  private baseUrl: string
  private appId: string
  private secretKey: string
  private useMock: boolean

  constructor() {
    this.baseUrl = env.get('DOJAH_BASE_URL') || 'https://api.dojah.io'
    this.appId = env.get('DOJAH_APP_ID') || ''
    this.secretKey = env.get('DOJAH_SECRET_KEY') || ''

    // Force mock mode in development or when credentials are missing
    const nodeEnv = env.get('NODE_ENV')
    this.useMock = nodeEnv === 'development' || !this.appId || !this.secretKey
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': this.secretKey,
        'AppId': this.appId,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = (await response.json()) as DojahErrorResponse
      throw new Error(error.error?.message || 'Verification failed')
    }

    return response.json() as Promise<T>
  }

  private mockVerification(identifier: string): KycVerificationResult {
    console.log('[MOCK KYC] Verifying:', identifier)

    if (identifier.length !== 11) {
      return { success: false, error: 'Invalid BVN/NIN format - must be 11 digits' }
    }

    return {
      success: true,
      firstName: 'Test',
      lastName: 'User',
      middleName: '',
      phoneNumber: '08012345678',
      dateOfBirth: '1990-01-01',
    }
  }

  async verifyBvn(bvn: string): Promise<KycVerificationResult> {
    console.log('[KYC] verifyBvn called, useMock:', this.useMock)

    if (this.useMock) {
      return this.mockVerification(bvn)
    }

    try {
      const response = await this.makeRequest<DojahBvnResponse>('/api/v1/kyc/bvn', { bvn })

      return {
        success: true,
        firstName: response.entity.first_name,
        lastName: response.entity.last_name,
        middleName: response.entity.middle_name,
        phoneNumber: response.entity.phone_number1,
        dateOfBirth: response.entity.date_of_birth,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'BVN verification failed',
      }
    }
  }

  async verifyNin(nin: string): Promise<KycVerificationResult> {
    console.log('[KYC] verifyNin called, useMock:', this.useMock)

    if (this.useMock) {
      return this.mockVerification(nin)
    }

    try {
      const response = await this.makeRequest<DojahNinResponse>('/api/v1/kyc/nin', { nin })

      return {
        success: true,
        firstName: response.entity.first_name,
        lastName: response.entity.last_name,
        middleName: response.entity.middle_name,
        phoneNumber: response.entity.phone_number,
        dateOfBirth: response.entity.date_of_birth,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'NIN verification failed',
      }
    }
  }
}
