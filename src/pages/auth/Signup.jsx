import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { User, Stethoscope, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'
import { PROFESSIONAL_TYPE_OPTIONS } from '../../data/professionalTypes.js'

// Which portal this build is locked to (see Login.jsx). Unset means local
// development: both account types can be chosen. The admin portal has no
// signup at all, since admin accounts are never self-created.
const VALID_PORTALS = ['user', 'professional', 'admin']
const PORTAL = VALID_PORTALS.includes(import.meta.env.VITE_PORTAL) ? import.meta.env.VITE_PORTAL : null

// Optional: address of the professional site. Used for the "Apply to join"
// link on the patient site. If it is not set, that link is simply hidden.
const PRO_SITE_URL = import.meta.env.VITE_PRO_URL || ''

const VARIANTS = {
  user: {
    panelBg: 'bg-navy-800',
    button: 'bg-navy-800 hover:bg-navy-700',
    emailLabel: 'Email',
  },
  professional: {
    panelBg: 'bg-navy-900',
    button: 'bg-navy-900 hover:bg-navy-800',
    emailLabel: 'Work email',
  },
}

const PATIENT_POINTS = [
  'Private and confidential',
  'Verified, licensed professionals',
  'Affordable student rate, paid by M-Pesa',
]

const ACCOUNT_TYPES = [
  { id: 'user', label: 'User', Icon: User },
  { id: 'professional', label: 'Professional', Icon: Stethoscope },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'
const LABEL_CLASS = 'text-sm font-semibold text-navy-800 mb-1.5 block'

// The logo file is turned solid white with a CSS filter, so it reads on navy.
const LOGO_CLASS = 'h-auto brightness-0 invert'

export default function Signup() {
  const [selected, setSelected] = useState(PORTAL === 'professional' ? 'professional' : 'user')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [orgCode, setOrgCode] = useState('')
  const [professionalType, setProfessionalType] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [notice, setNotice] = useState(null)
  const navigate = useNavigate()
  const { registerUser, registerProfessional, authError } = useAppState()

  if (PORTAL === 'admin') {
    return <Navigate to="/" replace />
  }

  const isPro = selected === 'professional'
  const v = VARIANTS[selected]
  const errorText = localError || authError

  const handleCreate = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError("The two passwords don't match.")
      return
    }
    setSubmitting(true)
    const name = fullName.trim()
    const mail = email.trim()
    const code = orgCode.trim()
    const result = isPro
      ? await registerProfessional(name, mail, password, professionalType)
      : await registerUser(name, mail, password, consent, code)
    // A wrong or full code stops the sign-up with a message (shown below), and
    // no account is made, so it can be corrected or left blank.
    if (!result) {
      setSubmitting(false)
      return
    }

    if (isPro) {
      setSubmitting(false)
      navigate('/pro')
      return
    }

    // The code now goes in with the sign-up. If the server did not answer with
    // a programme at all (an older server that ignores the code), link it now
    // the old way, so a code is never silently dropped.
    let institution = result.institution
    if (code && institution === undefined) {
      try {
        await api.enrollInInstitution(code)
        institution = null
      } catch (err) {
        setSubmitting(false)
        setNotice(
          `Your account is ready, but the code couldn't be linked (${err.message}). You can try again in Settings.`
        )
        return
      }
    }

    setSubmitting(false)
    // A programme that asks for proof of being a student gets a short extra step.
    navigate(institution?.requiresStudentProof ? '/app/welcome' : '/app')
  }

  // Shown only when the account was created but the optional code failed.
  if (notice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <Check className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-xl font-extrabold text-navy-800 mb-2">Account created</h1>
          <p role="status" className="text-sm text-ink-600 mb-6">
            {notice}
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            className="flex h-[50px] w-full items-center justify-center rounded-xl bg-navy-800 font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Go to Settings
          </button>
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="mt-3 text-sm font-semibold text-navy-800 hover:text-navy-600"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50">
      {/* Small screens: a slim navy header instead of the full panel */}
      <div className={`lg:hidden px-6 py-5 ${v.panelBg}`}>
        <img src="/logo-full.png" alt="Mindora" className={`w-20 ${LOGO_CLASS}`} />
        {isPro && (
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-brand-amber">FOR PROFESSIONALS</p>
        )}
      </div>

      <div className={`relative hidden lg:flex flex-col justify-between overflow-hidden p-14 text-white ${v.panelBg}`}>
        <div className="pointer-events-none absolute top-24 right-28 h-28 w-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10" />

        <div className="relative">
          <img src="/logo-full.png" alt="Mindora" className={`w-28 ${LOGO_CLASS}`} />
          {isPro && (
            <p className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-brand-amber">FOR PROFESSIONALS</p>
          )}
        </div>

        <div className="relative max-w-md">
          {isPro ? (
            <>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
                Apply to join Mindora.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-navy-100">
                See clients online, set your own availability, and get paid by M-Pesa. Session prices are fixed by
                Mindora. Our team reviews every application before a profile goes live.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
                Support, before the crisis.
              </h1>
              <ul className="mt-8 space-y-4">
                {PATIENT_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-base text-white">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-700">
                      <Check className="h-4 w-4 text-brand-amber" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="relative text-sm text-navy-100">Mental health before crisis.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-md">
          {!PORTAL && (
            <div
              role="tablist"
              aria-label="Account type"
              className="grid grid-cols-2 gap-1 rounded-xl border border-ink-200 p-1 mb-6 bg-ink-50"
            >
              {ACCOUNT_TYPES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected === id}
                  onClick={() => setSelected(id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    selected === id ? 'bg-white shadow-soft text-navy-800' : 'text-ink-500'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-3xl font-extrabold tracking-tight text-navy-800">Create your account</h2>
          <p className="mt-1 mb-6 text-sm text-ink-600">
            Already have one?{' '}
            <Link to="/" className="font-semibold text-navy-800 underline">
              Sign in
            </Link>
          </p>

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
                {v.emailLabel}
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

            <div className="grid gap-4 sm:grid-cols-2">
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
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p id="signup-password-hint" className="mt-1 text-xs text-ink-500">
                  At least 8 characters.
                </p>
              </div>

              <div>
                <label htmlFor="signup-confirm" className={LABEL_CLASS}>
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {isPro ? (
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
                  className={INPUT_CLASS}
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
                <p id="signup-profession-hint" className="mt-1 text-xs text-ink-500">
                  Choose the profession you are licensed for. Mindora checks this against your licence before you are
                  listed.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="signup-code" className={LABEL_CLASS}>
                    Pilot, promo, university or company code <span className="font-normal text-ink-500">(optional)</span>
                  </label>
                  <input
                    id="signup-code"
                    autoComplete="off"
                    placeholder="e.g. from your university, employer or a promotion"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    aria-describedby="signup-code-hint"
                    className={INPUT_CLASS}
                  />
                  <p id="signup-code-hint" className="mt-1 text-xs text-ink-500">
                    Some programmes offer free or covered care to students and ask for proof that you are one. You can add
                    it right after you sign up.
                  </p>
                </div>

                <label htmlFor="signup-consent" className="flex cursor-pointer items-start gap-3">
                  <input
                    id="signup-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm leading-relaxed text-ink-600">
                    I understand that my wellbeing check-in responses are sensitive health information, and I consent
                    to Mindora processing this data to provide screening, referrals, and support.
                  </span>
                </label>
              </>
            )}

            {errorText && (
              <p role="alert" className="text-sm text-red-600">
                {errorText}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`flex h-[50px] w-full items-center justify-center rounded-xl font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${v.button}`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
            </button>
          </form>

          {!isPro && (
            <p className="mt-6 text-sm text-ink-600">
              Are you a licensed professional?{' '}
              {!PORTAL ? (
                <button
                  type="button"
                  onClick={() => setSelected('professional')}
                  className="font-semibold text-navy-800 underline"
                >
                  Apply to join Mindora
                </button>
              ) : PRO_SITE_URL ? (
                <a href={PRO_SITE_URL} className="font-semibold text-navy-800 underline">
                  Apply to join Mindora
                </a>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
