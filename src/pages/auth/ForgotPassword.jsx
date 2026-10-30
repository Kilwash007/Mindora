import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Check, Eye, EyeOff, Loader2, User, Stethoscope } from 'lucide-react'

// Which portal this build is locked to (see Login.jsx). The admin portal has
// no email reset: admin passwords are reset by another platform admin.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const INPUT_CLASS =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'
const LABEL_CLASS = 'text-sm font-semibold text-navy-800 mb-1.5 block'
const BUTTON_CLASS =
  'flex h-[50px] w-full items-center justify-center rounded-xl bg-navy-800 font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60'

const ROLES = [
  { id: 'user', label: 'User', Icon: User },
  { id: 'professional', label: 'Professional', Icon: Stethoscope },
]

async function post(path, body) {
  const res = await fetch(`${BASE_URL}/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Please check your details and try again.'
    throw new Error(message)
  }
  return data
}

export default function ForgotPassword() {
  const [role, setRole] = useState(PORTAL === 'professional' ? 'professional' : 'user')
  const [step, setStep] = useState('request') // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (PORTAL === 'admin') return <Navigate to="/" replace />

  const handleRequest = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await post('/forgot-password', { role, email: email.trim() })
      setStep('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("The two passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await post('/reset-password', { role, email: email.trim(), code, newPassword: password })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-navy-800 px-6 py-5">
        <img src="/logo-full.png" alt="Mindora" className="h-auto w-20 brightness-0 invert" />
      </div>

      <div className="flex justify-center px-6 py-10">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">
          {step === 'done' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
                <Check className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="mb-2 text-xl font-extrabold text-navy-800">Password updated</h1>
              <p className="mb-6 text-sm text-ink-600">
                You can now sign in with your new password. For your security, you have been signed out on every
                device.
              </p>
              <Link
                to="/"
                className="flex h-[50px] w-full items-center justify-center rounded-xl bg-navy-800 font-semibold text-white transition-colors hover:bg-navy-700"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              {!PORTAL && step === 'request' && (
                <div
                  role="tablist"
                  aria-label="Account type"
                  className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-ink-200 bg-ink-50 p-1"
                >
                  {ROLES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={role === id}
                      onClick={() => setRole(id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                        role === id ? 'bg-white text-navy-800 shadow-soft' : 'text-ink-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}

              <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Reset your password</h1>

              {step === 'request' ? (
                <form onSubmit={handleRequest} className="mt-4 space-y-4">
                  <p className="text-sm text-ink-600">
                    Enter your email and we'll send you a 6-digit code to choose a new password.
                  </p>
                  <div>
                    <label htmlFor="reset-email" className={LABEL_CLASS}>
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={busy} className={BUTTON_CLASS}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReset} className="mt-4 space-y-4">
                  <p role="status" className="text-sm text-ink-600">
                    If an account exists for <span className="font-semibold text-navy-800">{email.trim()}</span>, we've
                    sent a 6-digit code. It expires in 10 minutes.
                  </p>
                  <div>
                    <label htmlFor="reset-code" className={LABEL_CLASS}>
                      6-digit code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      placeholder="------"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className={`${INPUT_CLASS} text-center text-xl font-semibold tracking-[0.4em]`}
                    />
                  </div>
                  <div>
                    <label htmlFor="reset-password" className={LABEL_CLASS}>
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="reset-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${INPUT_CLASS} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">At least 8 characters.</p>
                  </div>
                  <div>
                    <label htmlFor="reset-confirm" className={LABEL_CLASS}>
                      Confirm new password
                    </label>
                    <input
                      id="reset-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={busy || code.length !== 6} className={BUTTON_CLASS}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('request')
                      setCode('')
                      setError(null)
                    }}
                    className="w-full text-center text-sm font-semibold text-navy-800 hover:text-navy-600"
                  >
                    Use a different email or send a new code
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-ink-600">
                <Link to="/" className="font-semibold text-navy-800 underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
