import { useEffect, useRef, useState } from 'react'
import { Shield, Camera, Monitor, Wifi, WifiOff, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import { login } from './api'
import { CaptureService } from './capture'

export default function App() {
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem('user_name')
    return name ? { name, role: localStorage.getItem('user_role') } : null
  })
  const [email, setEmail] = useState('student1@proctor.io')
  const [password, setPassword] = useState('student123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState({ connected: false, webcam: false, screen: false, studentId: null })
  const captureRef = useRef(null)
  const previewRef = useRef(null)

  useEffect(() => {
    return () => captureRef.current?.stop()
  }, [])

  const doLogin = async () => {
    setError(''); setBusy(true)
    try {
      const data = await login(email, password)
      if (data.role !== 'student') {
        setError('Use the proctor dashboard for teacher/admin accounts.')
        setBusy(false)
        return
      }
      setUser({ name: data.name, role: data.role })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  const joinSession = async () => {
    setError(''); setBusy(true)
    try {
      const cap = new CaptureService()
      cap.onStatus = (s) => setStatus((prev) => ({ ...prev, ...s }))
      captureRef.current = cap
      const token = localStorage.getItem('access_token')
      await cap.connect(token)
      await cap.startWebcam()
      // Show local preview of own webcam
      if (previewRef.current && cap.webcamStream) {
        previewRef.current.srcObject = cap.webcamStream
        previewRef.current.play().catch(() => {})
      }
    } catch (e) {
      setError(e.message === 'Permission denied'
        ? 'Camera permission denied. Allow access and retry.'
        : `Could not join session: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const enableScreen = async () => {
    try { await captureRef.current?.startScreen() }
    catch { setError('Screen share was cancelled or denied.') }
  }

  const leaveSession = () => {
    captureRef.current?.stop()
    captureRef.current = null
    setStatus({ connected: false, webcam: false, screen: false, studentId: null })
  }

  const logout = () => {
    leaveSession()
    localStorage.clear()
    setUser(null)
  }

  // ---- Login screen ----
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">Proctor</h1>
              <p className="text-xs text-slate-400">Student sign in</p>
            </div>
          </div>
          {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          <button onClick={doLogin} disabled={busy}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    )
  }

  // ---- Monitoring screen ----
  const monitoring = status.connected && status.webcam
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Proctor — Student</h1>
              <p className="text-[10px] text-slate-400">{user.name}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Status banner */}
        <div className={`mb-5 flex items-center gap-3 rounded-xl border p-4 ${
          monitoring ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
        }`}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
            monitoring ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {monitoring ? <CheckCircle2 className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {monitoring ? 'You are being monitored' : 'Not connected'}
            </p>
            <p className="text-xs text-slate-500">
              {monitoring
                ? `Session active${status.studentId ? ' · ' + status.studentId : ''}. Stay in view of your camera.`
                : 'Join the session to begin your exam.'}
            </p>
          </div>
        </div>

        {/* Own webcam preview */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <video ref={previewRef} muted playsInline className="h-64 w-full object-cover" />
        </div>

        {/* Indicators */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Indicator icon={Wifi} label="Connection" on={status.connected} />
          <Indicator icon={Camera} label="Webcam" on={status.webcam} />
          <Indicator icon={Monitor} label="Screen" on={status.screen} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {!status.connected ? (
            <button onClick={joinSession} disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              <Camera className="h-4 w-4" /> {busy ? 'Joining…' : 'Join monitoring session'}
            </button>
          ) : (
            <>
              {!status.screen && (
                <button onClick={enableScreen}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  <Monitor className="h-4 w-4" /> Share screen
                </button>
              )}
              <button onClick={leaveSession}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
                <LogOut className="h-4 w-4" /> Leave session
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Your webcam and screen are streamed to your instructor for exam integrity.
          Keep your face visible and avoid switching windows.
        </p>
      </main>
    </div>
  )
}

function Indicator({ icon: Icon, label, on }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-3 ${
      on ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
    }`}>
      <Icon className={`h-4 w-4 ${on ? 'text-emerald-600' : 'text-slate-400'}`} />
      <div>
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <p className={`text-[10px] font-semibold ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
          {on ? 'Active' : 'Off'}
        </p>
      </div>
    </div>
  )
}
