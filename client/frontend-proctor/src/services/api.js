// REST client (Axios) for request/response actions: auth, fetching lists,
// reviewing alerts. The live stream is handled separately in socket.js.
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: `${BASE}/api/v1` })

// Attach the JWT to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try a refresh once, then retry the original request
let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshing) {
          const rt = localStorage.getItem('refresh_token')
          refreshing = axios
            .post(`${BASE}/api/v1/auth/refresh`, { refresh_token: rt })
            .finally(() => { refreshing = null })
        }
        const { data } = await refreshing
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// --- Auth ---
export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  localStorage.setItem('user_name', data.name)
  localStorage.setItem('user_role', data.role)
  return data
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}

export function logout() {
  localStorage.clear()
  window.location.href = '/login'
}

// --- Data ---
export const fetchStudents = () => api.get('/students').then((r) => r.data)
export const fetchStudent = (id) => api.get(`/students/${id}`).then((r) => r.data)
export const fetchAlerts = (limit = 100) =>
  api.get('/alerts', { params: { limit } }).then((r) => r.data)
export const reviewAlert = (id, notes) =>
  api.post(`/alerts/${id}/review`, { notes }).then((r) => r.data)
export const fetchAnalytics = () => api.get('/analytics/summary').then((r) => r.data)
