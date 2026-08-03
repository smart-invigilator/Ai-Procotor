// REST helper for the student app: login + register only.
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const api = axios.create({ baseURL: `${BASE}/api/v1` })

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('user_name', data.name)
  localStorage.setItem('user_role', data.role)
  return data
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('user_name', data.name)
  localStorage.setItem('user_role', data.role)
  return data
}

export { BASE }
