// REAL real-time service. Drop-in replacement for the mock socket.js.
// Exposes the SAME interface the mock did — on(event, cb), connect(),
// disconnect() — so MonitorContext.jsx does not need to change.
//
// It connects to the FastAPI Socket.IO server, authenticates as a dashboard
// client, and re-emits the server's events under the same names the app
// already listens for: 'connected', 'students:init', 'students:tick', 'alert'.
import { io } from 'socket.io-client'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class RealMonitorService {
  constructor() {
    this.listeners = {}
    this.socket = null
    // live webcam/screen frames keyed by studentId, for card previews
    this.frames = { webcam: {}, screen: {} }
  }

  on(event, cb) {
    ;(this.listeners[event] ||= []).push(cb)
    return () => {
      this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== cb)
    }
  }

  emit(event, payload) {
    ;(this.listeners[event] || []).forEach((cb) => cb(payload))
  }

  connect() {
    if (this.socket) return
    const token = localStorage.getItem('access_token')

    this.socket = io(BASE, { path: '/socket.io', transports: ['websocket'] })

    this.socket.on('connect', async () => {
      // Join the dashboard room; server replies with the current snapshot
      const ack = await this.socket
        .timeout(5000)
        .emitWithAck('dashboard:join', { token })
        .catch(() => ({ ok: false }))
      this.emit('connected', !!ack?.ok)
    })

    this.socket.on('disconnect', () => this.emit('connected', false))

    // Server -> dashboard events, forwarded under the app's expected names
    this.socket.on('students:init', (data) => this.emit('students:init', data))
    this.socket.on('students:tick', (data) => this.emit('students:tick', data))
    this.socket.on('alert', (data) => this.emit('alert', data))

    // Live frame previews (optional): stash latest frame per student
    this.socket.on('frame:webcam', ({ studentId, image }) => {
      this.frames.webcam[studentId] = image
      this.emit('frame:webcam', { studentId, image })
    })
    this.socket.on('frame:screen', ({ studentId, image }) => {
      this.frames.screen[studentId] = image
      this.emit('frame:screen', { studentId, image })
    })
  }

  // Helper the LiveFeed component can call to get the latest real frame
  getFrame(type, studentId) {
    return this.frames[type]?.[studentId] || null
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export const monitorService = new RealMonitorService()

// The mock also exported ALERT_TYPES for the charts; provide the same list so
// imports keep working without changes.
export const ALERT_TYPES = [
  { type: 'No Face Detected', severity: 'high' },
  { type: 'Multiple Faces', severity: 'high' },
  { type: 'Phone Detected', severity: 'high' },
  { type: 'Looking Away', severity: 'low' },
  { type: 'Left Seat', severity: 'medium' },
  { type: 'Suspicious Behavior', severity: 'medium' },
  { type: 'Books', severity: 'medium' },
  { type: 'External Screen', severity: 'medium' },
]
