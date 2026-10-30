import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Stethoscope, ShieldCheck, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { useAppState } from '../../data/AppState.jsx'

// Which portal this build is locked to. Set VITE_PORTAL to 'user',
// 'professional', or 'admin' on each hosted site. When it is unset (local
// development), all three tabs show.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null

// Show the "clinical oversight" line on the professional page only once a
// psychiatrist has actually been confirmed as Clinical Director.
const SHOW_CLINICAL_OVERSIGHT = false

const VARIANTS = {
  user: {
    panelBg: 'bg-navy-800',
    button: 'bg-navy-800 hover:bg-navy-700',
    title: 'Sign in',
    emailLabel: 'Email',
    headline: 'Welcome back.',
    blurb: 'Your private space to check in, talk to someone and keep going, at your own pace.',
    switchText: 'New to Mindora?',
    switchLink: 'Create an account',
    note: "Your sessions and messages are private. Mindora protects your data under Kenya's Data Protection Act, 2019.",
  },
  professional: {
    panelBg: 'bg-navy-900',
    button: 'bg-navy-900 hover:bg-navy-800',
    title: 'Professional sign in',
    emailLabel: 'Work email',
    headline: 'Welcome back to your practice.',
    blurb: 'Your sessions, clients, referrals and payouts, all in one secure place.',
    switchText: 'Not on Mindora yet?',
    switchLink: 'Apply to join',
    note: 'By signing in you agree to keep client information confidential, as set out in your professional agreement.',
  },
  admin: {
    panelBg: 'bg-navy-950',
    button: 'bg-navy-950 hover:bg-navy-900',
    title: 'Admin sign in',
    subtitle: 'Authorised Mindora staff only.',
    emailLabel: 'Email',
    note: 'Every admin sign-in and action is logged.',
  },
}

const AUDIENCES = [
  { id: 'user', label: 'User', Icon: User },
  { id: 'professional', label: 'Professional', Icon: Stethoscope },
  { id: 'admin', label: 'Admin', Icon: ShieldCheck },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'

// The logo file is turned solid white with a CSS filter, so it reads on navy.
const LOGO_CLASS = 'h-auto brightness-0 invert'

function CrisisBox({ className = '' }) {
  return (
    <div className={`rounded-2xl bg-navy-700/70 px-5 py-4 text-sm leading-relaxed text-white ${className}`}>
      <span className="font-bold">Need help right now?</span> Call 999 or 112, or Kenya Red Cross on 1199, free and 24
      hours.
    </div>
  )
}

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

  const portal = PORTAL || audience
  const v = VARIANTS[portal]

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
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-navy-800 mb-1 text-center">Check your email</h2>
          <p className="text-sm text-ink-500 mb-6 text-center">
            We sent a 6-digit code to <span className="font-medium text-navy-700">{otpPending.email}</span>
          </p>

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
              placeholder="------"
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

  // Local development only: switch between the three portals.
  const tabs = !PORTAL && (
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
  )

  const form = (
    <form className="space-y-4" onSubmit={handleLogin}>
      <div>
        <label htmlFor="login-email" className="text-sm font-semibold text-navy-800 mb-1.5 block">
          {v.emailLabel}
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
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-semibold text-navy-800">
            Password
          </label>
          {portal !== 'admin' && (
            <Link to="/forgot-password" className="text-xs font-semibold text-navy-800 underline">
              Forgot password?
            </Link>
          )}
        </div>
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
            onClick={() => setShowPassword((s) => !s)}
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
      <button
        type="submit"
        disabled={submitting}
        className={`flex h-[50px] w-full items-center justify-center rounded-xl font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${v.button}`}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
      </button>
      <p className="text-xs text-ink-500 text-center">We'll email you a 6-digit code to finish signing in.</p>
      {portal === 'admin' && (
        <p className="text-xs text-ink-500 text-center">
          Forgot your password? Ask another platform admin to reset it.
        </p>
      )}
    </form>
  )

  // --- Admin: a centred card on dark navy ---
  if (portal === 'admin') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full border-[56px] border-navy-800/70" />
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-navy-900" />

        <div className="relative mb-6 flex flex-col items-center">
          <img src="/logo-full.png" alt="Mindora" className={`w-28 ${LOGO_CLASS}`} />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.2em] text-brand-amber">ADMIN CONSOLE</p>
        </div>

        <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-lift">
          {tabs}
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">{v.title}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-600">{v.subtitle}</p>
          {form}
        </div>

        <p className="relative mt-6 flex items-center gap-2 text-sm text-navy-200">
          <Lock className="h-4 w-4 text-brand-amber" />
          {v.note}
        </p>
      </div>
    )
  }

  // --- Patient and professional: navy panel on the left, form on the right ---
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50">
      {/* Small screens: a slim navy header instead of the full panel */}
      <div className={`lg:hidden px-6 py-5 ${v.panelBg}`}>
        <img src="/logo-full.png" alt="Mindora" className={`w-20 ${LOGO_CLASS}`} />
        {portal === 'professional' && (
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-brand-amber">FOR PROFESSIONALS</p>
        )}
      </div>

      <div className={`relative hidden lg:flex flex-col justify-between overflow-hidden p-14 text-white ${v.panelBg}`}>
        <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-28 right-24 h-36 w-36 rounded-full bg-white/10" />

        <div className="relative">
          <img src="/logo-full.png" alt="Mindora" className={`w-28 ${LOGO_CLASS}`} />
          {portal === 'professional' && (
            <p className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-brand-amber">FOR PROFESSIONALS</p>
          )}
        </div>

        <div className="relative max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white">{v.headline}</h1>
          <p className="mt-5 text-lg leading-relaxed text-navy-100">{v.blurb}</p>
        </div>

        <div className="relative">
          {portal === 'user' && <CrisisBox />}
          {portal === 'professional' && SHOW_CLINICAL_OVERSIGHT && (
            <p className="flex items-center gap-2 text-sm text-navy-100">
              <ShieldCheck className="h-4 w-4 text-brand-amber" />
              Clinical oversight by a psychiatrist as Clinical Director
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-sm">
          {tabs}
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-800">{v.title}</h2>
          <p className="mt-1 mb-6 text-sm text-ink-600">
            {v.switchText}{' '}
            <Link to="/signup" className="font-semibold text-navy-800 underline">
              {v.switchLink}
            </Link>
          </p>
          {form}
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-600">
            {portal === 'user' && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />}
            <span>{v.note}</span>
          </p>
          {portal === 'user' && <CrisisBox className="mt-6 lg:hidden" />}
        </div>
      </div>
    </div>
  )
}
