import { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react'
import { monitorService } from '../services/socket'

const MonitorContext = createContext(null)

const initial = {
  students: [],
  alerts: [],
  connected: false,
  loading: true,
}

function normalizeStudent(s) {
  // Backend sends a lean student object; fill mock-era fields so components
  // (which expect avatarSeed, confidence, alerts) never crash on undefined.
  return {
    avatarSeed: s.id,
    confidence: null,
    alerts: [],
    behaviors: [],
    metrics: {},
    ...s,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: action.payload }
    case 'INIT':
      return { ...state, students: action.payload.map(normalizeStudent), loading: false }
    case 'TICK': {
      // merge incoming snapshot but keep local-only fields stable
      const incoming = action.payload.map(normalizeStudent)
      const map = new Map(incoming.map((s) => [s.id, s]))
      const merged = state.students.length
        ? state.students.map((s) => (map.has(s.id) ? { ...s, ...map.get(s.id) } : s))
        : incoming
      return { ...state, students: merged }
    }
    case 'ALERT': {
      const { alert, student } = action.payload
      const students = state.students.map((s) => (s.id === student.id ? { ...s, ...student } : s))
      return { ...state, students, alerts: [alert, ...state.alerts].slice(0, 200) }
    }
    case 'REVIEW_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, reviewed: true } : a)),
      }
    case 'NOTE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, notes: action.notes } : a)),
      }
    default:
      return state
  }
}

export function MonitorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { ...toast, id }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    const offs = [
      monitorService.on('connected', (v) => dispatch({ type: 'CONNECTED', payload: v })),
      monitorService.on('students:init', (v) => dispatch({ type: 'INIT', payload: v })),
      monitorService.on('students:tick', (v) => dispatch({ type: 'TICK', payload: v })),
      monitorService.on('alert', (v) => {
        dispatch({ type: 'ALERT', payload: v })
        pushToast({
          title: v.student.name,
          message: v.alert.type,
          severity: v.alert.severity,
          studentId: v.student.id,
        })
      }),
    ]
    monitorService.connect()
    return () => {
      offs.forEach((off) => off())
      monitorService.disconnect()
    }
  }, [pushToast])

  const reviewAlert = useCallback((id) => dispatch({ type: 'REVIEW_ALERT', id }), [])
  const noteAlert = useCallback((id, notes) => dispatch({ type: 'NOTE_ALERT', id, notes }), [])

  return (
    <MonitorContext.Provider
      value={{ ...state, toasts, pushToast, dismissToast, reviewAlert, noteAlert }}
    >
      {children}
    </MonitorContext.Provider>
  )
}

export function useMonitor() {
  const ctx = useContext(MonitorContext)
  if (!ctx) throw new Error('useMonitor must be used within MonitorProvider')
  return ctx
}
