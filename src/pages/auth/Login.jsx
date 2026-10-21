import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Stethoscope, ShieldCheck, Loader2, Eye, EyeOff, Mail } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { useAppState } from '../../data/AppState.jsx'

// Which portal this build is locked to. Set VITE_PORTAL to 'user',
// 'professional', or 'admin' on each hosted site. When it is unset (local
// development), all three tabs show.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null

// Staging only: shows a notice on the code screen that no email is sent
// and the code is 000000. Set VITE_TEST_CODE=true to turn it on.
// Must stay OFF on every live site.
const SHOW_TEST_CODE = import.meta.env.VITE_TEST_CODE === 'true'

const HEADINGS = {
  user: { title: 'Welcome back', subtitle: 'Sign in to continue your wellbeing journey.' },
  professional: { title: 'Professional sign in', subtitle: 'Sign in to manage your referrals and clients.' },
  admin: { title: 'Admin sign in', subtitle: 'Authorised staff only.' },
}

const AUDIENCES = [
  { id: 'user', label: 'User', Icon: User },
  { id: 'professional', label: 'Professional', Icon: Stethoscope },
  { id: 'admin', label: 'Admin', Icon: ShieldCheck },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'

export default function Login() {
  const [audience, setAudience] = useState(PORTAL || 'user') // 'user' | 'professional' | 'admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const navigate = useNavigate()
  const { requestLogin, verifyOtp, cancelOtp, otpPending, authError } = useAppState()

  const heading = HEADINGS[PORTAL || audience] || HEADINGS.user

  const handleLogin = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await requestLogin(audience, email.trim(), password)
    setSubmitting(false)
    // On success, otpPending gets set by AppState and the code screen below
    // renders automatically. No navigation happens at this step.
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!otpPending) return
    setVerifying(true)
    const role = otpPending.role
    const ok = await verifyOtp(otpCode)
    setVerifying(false)
    if (ok) {
      navigate(role === 'user' ? '/app' : role === 'professional' ? '/pro' : '/admin')
    }
  }

  // --- Code entry screen ---
  if (otpPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mindora-soft p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-navy-800 mb-1 text-center">Check your email</h2>
          <p className="text-sm text-ink-500 mb-6 text-center">
            We sent a 6-digit code to <span className="font-medium text-navy-700">{otpPending.email}</span>
          </p>

          {SHOW_TEST_CODE && otpPending.role !== 'admin' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4 text-center">
              Test environment: no email is sent. Enter 000000.
            </p>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <label htmlFor="otp-code" className="sr-only">
              6-digit code
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-center text-2xl tracking-[0.5em] font-semibold focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              autoFocus
            />
            {authError && (
              <p role="alert" className="text-sm text-red-600 text-center">
                {authError}
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              className="w-full"
              disabled={verifying || otpCode.length !== 6}
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and sign in'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              cancelOtp()
              setOtpCode('')
            }}
            className="w-full text-center text-sm text-ink-400 hover:text-navy-600 mt-6"
          >
            ← Back to sign in
          </button>

          <p className="text-xs text-ink-400 mt-4 text-center">
            The code expires in 10 minutes. Going back and signing in again will send a new one.
          </p>
        </div>
      </div>
    )
  }

  // --- Email and password screen ---
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-mindora-gradient text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-teal-400 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-navy-300 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-teal-400 flex items-center justify-center font-display font-bold text-navy-900">
            M
          </div>
          <span className="font-display font-bold text-xl">Mindora</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-display font-bold leading-tight mb-4">Mental health before crisis.</h1>
          <p className="text-navy-100 text-lg leading-relaxed">
            Understand your mental wellbeing. Identify potential risks early. Get connected to the right
            support.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-navy-200">
          <ShieldCheck className="h-4 w-4 text-teal-300" />
          Private, secure, and clinically responsible by design.
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="h-8 w-8 rounded-lg bg-teal-400 flex items-center justify-center font-display font-bold text-navy-900">
              M
            </div>
            <span className="font-display font-bold text-lg text-navy-800">Mindora</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-800 mb-1">{heading.title}</h2>
          <p className="text-ink-500 mb-6 text-sm">{heading.subtitle}</p>

          {!PORTAL && (
            <div
              role="tablist"
              aria-label="Account type"
              className="grid grid-cols-3 gap-1 rounded-xl border border-ink-200 p-1 mb-6 bg-ink-50"
            >
              {AUDIENCES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={audience === id}
                  onClick={() => setAudience(id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    audience === id ? 'bg-white shadow-soft text-navy-800' : 'text-ink-500'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-navy-700 mb-1 block">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-sm font-medium text-navy-700 mb-1 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT_CLASS} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {authError && (
              <p role="alert" className="text-sm text-red-600">
                {authError}
              </p>
            )}
            <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </Button>
            <p className="text-xs text-ink-400 text-center">We'll email you a 6-digit code to finish signing in.</p>
          </form>

          {PORTAL !== 'admin' && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-ink-100 flex-1" />
                <span className="text-xs text-ink-400">or</span>
                <div className="h-px bg-ink-100 flex-1" />
              </div>

              <Button type="button" variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
                Create account
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}