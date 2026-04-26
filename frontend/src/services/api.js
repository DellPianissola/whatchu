import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      const refreshToken = localStorage.getItem('refreshToken')

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

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

        processQueue(null, accessToken)
        original.headers['Authorization'] = `Bearer ${accessToken}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        delete api.defaults.headers.common['Authorization']
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Health check
export const checkHealth = () => api.get('/health')

// Movies
export const getMovies = (params = {}) => api.get('/movies', { params })
export const getMovieById = (id) => api.get(`/movies/${id}`)
export const createMovie = (data) => api.post('/movies', data)
export const updateMovie = (id, data) => api.put(`/movies/${id}`, data)
export const deleteMovie = (id) => api.delete(`/movies/${id}`)
export const drawMovie = () => api.post('/movies/draw')

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password })
export const register = (email, username, password) => api.post('/auth/register', { email, username, password })
export const getMe = () => api.get('/auth/me')

// Profiles
export const getProfiles = () => api.get('/profiles')
export const createProfile = (data) => api.post('/profiles', data)
export const updateProfile = (id, data) => api.put('/profiles', data)
export const markOnboarded = () => api.post('/profiles/onboarded')

// External APIs
const buildExtParams = ({ page, sortBy, genres } = {}) => {
  const params = {}
  if (page) params.page = page
  if (sortBy) params.sortBy = sortBy
  if (genres && genres.length > 0) params.genres = genres.join(',')
  return params
}

export const searchExternal = (query, type, page = 1, opts = {}) =>
  api.get('/external/search', {
    params: { q: query, type, ...buildExtParams({ page, ...opts }) },
  })

export const getPopularMovies = (page = 1, opts = {}) =>
  api.get('/external/movies', { params: buildExtParams({ page, ...opts }) })

export const getPopularSeries = (page = 1, opts = {}) =>
  api.get('/external/series', { params: buildExtParams({ page, ...opts }) })

export const getPopularAnimes = (page = 1, opts = {}) =>
  api.get('/external/animes', { params: buildExtParams({ page, ...opts }) })

export const getExternalGenres = (type) =>
  api.get('/external/genres', { params: { type } })

export const getMovieDetails = (id) =>
  api.get(`/external/movies/${id}`)

export const getSeriesDetails = (id) =>
  api.get(`/external/series/${id}`)

export const getAnimeDetails = (id) =>
  api.get(`/external/animes/${id}`)

export default api
