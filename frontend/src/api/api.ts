/* eslint-disable @typescript-eslint/no-explicit-any */
 
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse, Employee, LoginData, PaginatedResponse, SignupData, User } from '../utils/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add token to every request
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

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => {
    // Check if backend wants us to rotate token
    const rotationRequired = response.headers['x-token-rotation-required']
    if (rotationRequired === 'true') {
      // Refresh token in background (don't wait)
      refreshTokenSilently().catch(() => {
        // Silent fail - will be handled on next 401
      })
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      // Mark as retry to prevent infinite loop
      originalRequest._retry = true
      isRefreshing = true

      try {
        // Try to refresh the token
        const response = await refreshToken()
        const newToken = response.data.token

        // Save new token
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        // Update axios default header
        if (api.defaults.headers.common) {
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        }

        // Update the failed request's header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        // Process queued requests
        processQueue(null, newToken)

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError as Error, null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Other errors - just reject
    return Promise.reject(error)
  }
)

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/signup', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
      try {
         const response = await api.post<AuthResponse>('/api/auth/login', data)
         return response.data
      } catch (error: any) {
         if (axios.isAxiosError(error)) {
            const errorResponse =
            error.response?.data?.errors ||
            'Login failed'

            throw new Error(errorResponse[0].message)
         }

         throw new Error('Something went wrong')
      }
   },

  me: async (): Promise<{ data: User }> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/api/auth/logout-all')
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/refresh')
    return response.data
  },
}

export const employeeAPI = {
  list: async (params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get('/api/admin/employees', { params })
    return response.data
  },

  search: async (search: string): Promise<{ data: Employee[] }> => {
    const response = await api.get('/api/admin/employees/search', {
      params: { search },
    })
    return response.data
  },

  create: async (data: {
    name: string
    email: string
    password: string
  }): Promise<{ message: string; data: Employee }> => {
    const response = await api.post('/api/admin/employees', data)
    return response.data
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/admin/employees/${id}`)
    return response.data
  }
}

/**
 * Refresh token - used when 401 occurs
 */
async function refreshToken(): Promise<AuthResponse> {
  // eslint-disable-next-line no-useless-catch
  try {
    // Create a new axios instance without interceptors to avoid infinite loop
    const refreshApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })

    const response = await refreshApi.post<AuthResponse>('/api/auth/refresh')
    return response.data
  } catch (error) {
    // Refresh failed
    throw error
  }
}

/**
 * Silent token refresh - used for background rotation
 */
async function refreshTokenSilently(): Promise<void> {
  try {
    const response = await refreshToken()
    localStorage.setItem('token', response.data.token)
  } catch (error) {
    // Silent fail - will be handled on next 401
    console.error('Silent token refresh failed:', error)
  }
}

export default api