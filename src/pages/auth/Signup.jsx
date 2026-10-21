import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { User, Stethoscope, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { PROFESSIONAL_TYPE_OPTIONS } from '../../data/professionalTypes.js'

// Which portal this build is locked to (see Login.jsx). Unset means local
// development: both account types can be chosen. The admin portal has no
// signup at all, since admin accounts are never self-created.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null

const ACCOUNT_TYPES = [
  {
    id: 'user',
    title: "I'm a user",
    description: 'Track my wellbeing and get support',
    Icon: User,
  },
  {
    id: 'professional',
    title: "I'm a mental-health professional",
    description: 'Receive referrals and manage clients',
    Icon: Stethoscope,
  },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'

const LABEL_CLASS = 'text-sm font-medium text-navy-700 mb-1 block'

export default function Signup() {
  const [selected, setSelected] = useState(PORTAL === 'professional' ? 'professional' : 'user')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [professionalType, setProfessionalType] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { registerUser, registerProfessional, authError } = useAppState()

  if (PORTAL === 'admin') {
    return <Navigate to="/" replace />
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const cleanName = fullName.trim()
    const cleanEmail = email.trim()
    const ok =
      selected === 'user'
        ? await registerUser(cleanName, cleanEmail, password, consent)
        : await registerProfessional(cleanName, cleanEmail, password, professionalType)
    setSubmitting(false)
    if (ok) navigate(selected === 'user' ? '/app' : '/pro')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mindora-soft p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-teal-400 flex items-center justify-center font-display font-bold text-navy-900">
            M
          </div>
          <span className="font-display font-bold text-lg text-navy-800">Mindora</span>
        </div>

        <h1 className="text-2xl font-bold text-navy-800 mb-1">Create your account</h1>
        <p className="text-ink-500 text-sm mb-6">
          {PORTAL ? 'Fill in your details to get started.' : 'Tell us which kind of account you need.'}
        </p>

        {!PORTAL && (
          <div role="group" aria-label="Account type" className="space-y-3 mb-6">
            {ACCOUNT_TYPES.map(({ id, title, description, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={selected === id}
                onClick={() => setSelected(id)}
                className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                  selected === id ? 'border-teal-400 bg-teal-50/60' : 'border-ink-200 hover:border-ink-300'
                }`}
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-navy-800 text-white flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-navy-800 text-sm">{title}</p>
                  <p className="text-xs text-ink-500">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className={LABEL_CLASS}>
              Full name
            </label>
            <input
              id="signup-name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="signup-email" className={LABEL_CLASS}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="signup-password" className={LABEL_CLASS}>
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                aria-describedby="signup-password-hint"
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
            <p id="signup-password-hint" className="text-xs text-ink-400 mt-1">
              At least 8 characters.
            </p>
          </div>

          {selected === 'professional' && (
            <div>
              <label htmlFor="signup-profession" className={LABEL_CLASS}>
                Profession
              </label>
              <select
                id="signup-profession"
                value={professionalType}
                onChange={(e) => setProfessionalType(e.target.value)}
                required
                aria-describedby="signup-profession-hint"
                className={`${INPUT_CLASS} bg-white`}
              >
                <option value="" disabled>
                  Choose your profession
                </option>
                {PROFESSIONAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p id="signup-profession-hint" className="text-xs text-ink-400 mt-1">
                Choose the profession you are licensed for. Mindora checks this against your licence before you are
                listed.
              </p>
            </div>
          )}

          {selected === 'user' && (
            <label
              htmlFor="signup-consent"
              className="flex items-start gap-3 cursor-pointer rounded-xl border border-ink-200 bg-ink-50 p-3"
            >
              <input
                id="signup-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="text-xs text-ink-600 leading-relaxed">
                I understand that my wellbeing check-in responses are sensitive health information, and I consent to
                Mindora processing this data to provide screening, referrals, and support.
              </span>
            </label>
          )}

          {authError && (
            <p role="alert" className="text-sm text-red-600">
              {authError}
            </p>
          )}

          <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-6">
          Already have an account?{' '}
          <Link to="/" className="text-teal-600 font-semibold hover:text-teal-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}