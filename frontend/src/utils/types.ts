export interface SignupData {
  ownerName: string
  ownerEmail: string
  companyName: string
  planId: number
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  data: {
    token: string
    expiresAt: string
    user: User
  }
}

export interface User {
  name: string
  role: 'admin' | 'employee'
  companyName: string
}

export interface Employee extends User {
  id: number
  screenshot_count?: number
  last_screenshot_at?: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}