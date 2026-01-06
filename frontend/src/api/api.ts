/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import type {
  AuthResponse,
  Employee,
  LoginData,
  PaginatedResponse,
  SignupData,
  User,
} from '../utils/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  skipAuthRefresh?: boolean
}

let isRefreshing = false

let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // REQUIRED for httpOnly cookies
})

api.interceptors.response.use(
  (response) => {
    if (response.headers['x-token-rotation-required'] === 'true') {
      refreshTokenSilently().catch(() => {})
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig

    if (originalRequest?.skipAuthRefresh) {
      return Promise.reject(error)
    }

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await authAPI.refresh()
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)

        localStorage.removeItem('user')
        window.location.href = '/login'

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/api/auth/signup',
      data,
      { skipAuthRefresh: true }
    )

    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user))
    }

    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/api/auth/login',
      data,
      { skipAuthRefresh: true }
    )

    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user))
    }

    return response.data
  },

  me: async (): Promise<{ data: User }> => {
    const response = await api.get(
      '/api/auth/me',
      { skipAuthRefresh: true }
    )

    if (response.data.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data))
    }

    return response.data
  },

  logout: async (): Promise<void> => {
    try {
      await api.post(
        '/api/auth/logout',
        {},
        { skipAuthRefresh: true }
      )
    } finally {
      localStorage.removeItem('user')
    }
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/api/auth/refresh',
      {},
      { skipAuthRefresh: true }
    )

    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user))
    }

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

async function refreshTokenSilently(): Promise<void> {
  try {
    await authAPI.refresh()
  } catch {
    // intentionally silent
  }
}

export default api
