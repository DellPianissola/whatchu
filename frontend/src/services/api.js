import axios from 'axios'
import { ERROR_CODES } from '../constants/errorCodes'
import { STORAGE_KEYS } from '../constants/storageKeys'
import { ROUTES } from '../constants/routes'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const apiErrorMessage = (err, fallback) =>
  err?.response?.data?.error || fallback

export const mapUpstreamError = (err) => {
  const code = err?.response?.data?.code
  if (code === ERROR_CODES.UPSTREAM_RATE_LIMIT) {
    return 'Muitas buscas em pouco tempo. Tente novamente em alguns segundos.'
  }
  if (code === ERROR_CODES.UPSTREAM_DOWN) {
    return 'O serviço externo está indisponível no momento. Tente novamente em breve.'
  }
  return null
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

      if (!refreshToken) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefreshToken } = data

        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)

        processQueue(null, accessToken)
        original.headers['Authorization'] = `Bearer ${accessToken}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        window.location.href = ROUTES.LOGIN
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Health
export const checkHealth = async () => (await api.get('/health')).data

// Movies
export const getMovies     = async (params = {})   => (await api.get('/movies', { params })).data.movies
export const createMovie   = async (data)          => (await api.post('/movies', data)).data.movie
export const updateMovie   = async (id, data)      => (await api.put(`/movies/${id}`, data)).data.movie
export const deleteMovie   = async (id)            => { await api.delete(`/movies/${id}`) }
export const drawMovie     = async (filters = {})  => (await api.post('/movies/draw', filters)).data.movie

// Auth (público — chamadas autenticadas vivem no AuthContext via api.post direto)
export const resendVerificationPublic = async (email)          => { await api.post('/auth/resend-verification-public', { email }) }
export const requestPasswordReset     = async (email)          => { await api.post('/auth/request-password-reset', { email }) }
export const resetPassword            = async (token, password) => { await api.post('/auth/reset-password', { token, password }) }

// Profiles
export const createProfile  = async (data)     => { await api.post('/profiles', data) }
export const updateProfile  = async (id, data) => { await api.put('/profiles', data) }
export const markOnboarded  = async ()         => (await api.post('/profiles/onboarded')).data.profile
export const changeEmail    = async (email)    => { await api.put('/profiles/email', { email }) }
export const uploadAvatar   = async (formData) =>
  (await api.put('/profiles/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.profile

// External APIs
const buildExtParams = ({ page, sortBy, genres } = {}) => {
  const params = {}
  if (page) params.page = page
  if (sortBy) params.sortBy = sortBy
  if (genres && genres.length > 0) params.genres = genres.join(',')
  return params
}

export const searchExternal = async (query, type, page = 1, opts = {}) =>
  (await api.get('/external/search', {
    params: { q: query, type, ...buildExtParams({ page, ...opts }) },
  })).data

export const getPopularMovies = async (page = 1, opts = {}) =>
  (await api.get('/external/movies', { params: buildExtParams({ page, ...opts }) })).data

export const getPopularSeries = async (page = 1, opts = {}) =>
  (await api.get('/external/series', { params: buildExtParams({ page, ...opts }) })).data

export const getExternalGenres = async (type) =>
  (await api.get('/external/genres', { params: { type } })).data.genres

export const luckyDraw = async (filters = {}) => (await api.post('/external/lucky', filters)).data.movie

export const getMovieDetails  = async (id) => (await api.get(`/external/movies/${id}`)).data
export const getSeriesDetails = async (id) => (await api.get(`/external/series/${id}`)).data

export default api
