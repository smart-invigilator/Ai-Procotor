import { useEffect, useState } from 'react'
import { X, Maximize2, GraduationCap, CalendarDays, BadgeCheck, Activity } from 'lucide-react'
import Avatar from './Avatar'
import StatusBadge from './StatusBadge'
import AttentionBar from './AttentionBar'
import LiveFeed from './LiveFeed'
import SeverityTag from './SeverityTag'
import { clockTime, timeAgo } from '../utils/format'
import { fetchAlerts } from '../services/api'

export default function StudentDetailModal({ student, onClose }) {
  const [view, setView] = useState('face')
  const [fullscreen, setFullscreen] = useState(false)
  const [studentAlerts, setStudentAlerts] = useState([])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && (fullscreen ? setFullscreen(false) : onClose())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, fullscreen])

  // Load THIS student's alerts only (per-student alert categories)
  useEffect(() => {
    if (!student) return
    let active = true
    fetchAlerts(50, student.id)
      .then((rows) => { if (active) setStudentAlerts(rows) })
      .catch(() => {})
    return () => { active = false }
  }, [student])

  if (!student) return null

  const confidence = student.confidence ||
    (student.metrics ? {
      face: student.metrics.faces ? 0.95 : 0,
      attention: (student.attention ?? 0) / 100,
      emotion: student.metrics.emotion ? 0.8 : 0,
    } : { face: 0, attention: 0, emotion: 0 })
  const alerts = studentAlerts.length ? studentAlerts : (student.alerts || [])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar name={student.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{student.name}</h2>
                <StatusBadge status={student.connected ? student.status : 'offline'} />
              </div>
              <p className="font-mono text-xs text-slate-400">{student.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-5">
          {/* Left: live monitoring */}
          <div className="lg:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {['face', 'screen'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
                      view === v ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'
                    }`}
                  >
                    {v} feed
                  </button>
                ))}
              </div>
              <button onClick={() => setFullscreen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
              </button>
            </div>
            <LiveFeed type={view} studentId={student.id} connected={student.connected} size="lg" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              {Object.entries(confidence).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{k} conf.</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{Math.round(v * 100)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: info + timeline */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Student Info</h3>
              <dl className="space-y-1.5 text-xs">
                <Row icon={GraduationCap} label="Department" value={student.department} />
                <Row icon={CalendarDays} label="Session" value={student.session} />
                <Row icon={BadgeCheck} label="Attendance" value={student.attendance} />
                <Row icon={Activity} label="Last active" value={timeAgo(student.lastActivity)} />
              </dl>
              <div className="mt-3">
                <AttentionBar score={student.attention} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event Timeline · {alerts.length}
              </h3>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {alerts.length === 0 && <p className="text-xs text-slate-400">No events recorded.</p>}
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 border-l-2 border-slate-200 pl-2 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{a.type}</p>
                        <SeverityTag severity={a.severity} />
                      </div>
                      <p className="font-mono text-[10px] text-slate-400">{clockTime(a.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen feed */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6" onClick={() => setFullscreen(false)}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <span className="text-sm font-medium">{student.name} — {view} feed</span>
              <button onClick={() => setFullscreen(false)}><X className="h-5 w-5" /></button>
            </div>
            <LiveFeed type={view} studentId={student.id} connected={student.connected} size="lg" />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  )
}
