import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { User, Stethoscope, ArrowRight, Loader2 } from 'lucide-react'
import Button from '../../components/Button.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { PROFESSIONAL_TYPE_OPTIONS } from '../../data/professionalTypes.js'

// Which portal this build is locked to (see Login.jsx). Unset means local
// development: both account types can be chosen. The admin portal has no
// signup at all, since admin accounts are never self-created.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null

export default function Signup() {
  const [selected, setSelected] = useState(PORTAL === 'professional' ? 'professional' : 'user')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    const ok =
      selected === 'user'
        ? await registerUser(fullName, email, password, consent)
        : await registerProfessional(fullName, email, password, professionalType)
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
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => setSelected('user')}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                selected === 'user'
                  ? 'border-teal-400 bg-teal-50/60'
                  : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-navy-800 text-white flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-navy-800 text-sm">I'm a user</p>
                <p className="text-xs text-ink-500">Track my wellbeing and get support</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelected('professional')}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                selected === 'professional'
                  ? 'border-teal-400 bg-teal-50/60'
                  : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-navy-800 text-white flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-navy-800 text-sm">I'm a mental-health professional</p>
                <p className="text-xs text-ink-500">Receive referrals and manage clients</p>
              </div>
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
          <input
            placeholder="Password (min. 8 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />

          {selected === 'professional' && (
            <div>
              <select
                value={professionalType}
                onChange={(e) => setProfessionalType(e.target.value)}
                required
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
              >
                <option value="" disabled>
                  Your profession
                </option>
                {PROFESSIONAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-400 mt-1">
                Choose the profession you are licensed for. Mindora checks this against your licence before you are
                listed.
              </p>
            </div>
          )}

          {selected === 'user' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-1"
              />
              <span className="text-xs text-ink-600">
                I understand that my wellbeing check-in responses are sensitive health
                information, and I consent to Mindora processing this data to provide
                screening, referrals, and support.
              </span>
            </label>
          )}

          {authError && <p className="text-sm text-red-600">{authError}</p>}
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
          <Link to="/" className="text-teal-600 font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}