import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse, Employee, LoginData, PaginatedResponse, SignupData, User } from '../utils/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    const rotationRequired = response.headers['x-token-rotation-required']
    if (rotationRequired === 'true') {
      refreshToken().catch(() => {
        // Silent fail - user will refresh on next request
      })
    }
    return response
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  // Company signup
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/signup', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data)
    return response.data
  },

  me: async (): Promise<{ data: User }> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/refresh')
    return response.data
  },
}

// Employee API (Admin only)
export const employeeAPI = {
  // Get all employees
  list: async (params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get('/api/admin/employees', { params })
    return response.data
  },

  // Search employees
  search: async (search: string): Promise<{ data: Employee[] }> => {
    const response = await api.get('/api/admin/employees/search', {
      params: { search },
    })
    return response.data
  },

  // Get single employee
  get: async (id: number): Promise<{ data: Employee }> => {
    const response = await api.get(`/api/admin/employees/${id}`)
    return response.data
  },

  // Create employee
  create: async (data: {
    name: string
    email: string
    password: string
    screenshotInterval?: number
  }): Promise<{ message: string; data: Employee }> => {
    const response = await api.post('/api/admin/employees', data)
    return response.data
  },

  // Delete employee
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/admin/employees/${id}`)
    return response.data
  },
}

// Helper function to refresh token
async function refreshToken(): Promise<void> {
  try {
    const response = await authAPI.refresh()
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
  } catch (error) {
    // Token refresh failed, user needs to login again
    console.log(error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export default api