import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'

const PLATFORM = 'PLATFORM_ADMIN'
const CLINICAL = 'CLINICAL_SAFETY_REVIEWER'

const LEVEL_TONES = { LOW: 'low', ELEVATED: 'elevated', HIGH: 'high', ACUTE: 'acute' }

const INSTITUTION_TYPES = {
  EMPLOYER: 'Employer',
  UNIVERSITY: 'University',
  HEALTHCARE_PROVIDER: 'Healthcare provider',
  INSURER: 'Insurer',
  OTHER: 'Other',
}

const DOCUMENT_TYPES = {
  LICENSE: 'Licence',
  GOVERNMENT_ID: 'National ID',
  DEGREE_CERTIFICATE: 'Degree',
  OTHER: 'Other document',
}

const TIERS = [
  { key: 'student', label: 'Student rate', bar: 'bg-navy-800' },
  { key: 'corporate', label: 'Corporate (EAP)', bar: 'bg-teal-400' },
  { key: 'standard', label: 'Standard (self-pay)', bar: 'bg-brand-amber' },
]

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

// Loads one thing from the API, or nothing at all when `fetcher` is null
// (used when this admin's role isn't allowed to see that data). A failure in
// one card never breaks the others.
function useLoad(fetcher) {
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
    if (!fetcher) return undefined
    let cancelled = false
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return state
}

function CardTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold text-navy-800">{children}</h2>
      {action}
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <Card className="!p-5">
      <p className="text-xs text-ink-600">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-navy-800">{value ?? '—'}</p>
      <p className="mt-1 text-xs font-medium text-teal-700">{sub}</p>
    </Card>
  )
}

function Status({ state, children }) {
  if (state.error) return <p className="text-sm text-red-600">Couldn't load this section.</p>
  if (state.data === null) return <p className="text-sm text-ink-500">Loading...</p>
  return children
}

export default function Overview() {
  const { authUser } = useAppState()
  const role = authUser?.role
  const can = (...roles) => !role || roles.includes(role)

  const canSafety = can(PLATFORM, CLINICAL)
  const canProfessionals = can(PLATFORM, CLINICAL)
  const canPlatform = can(PLATFORM)

  const overview = useLoad(api.getAdminOverview)
  const safety = useLoad(canSafety ? api.getAdminSafety : null)
  const documents = useLoad(canProfessionals ? api.adminListDocuments : null)
  const professionals = useLoad(canProfessionals ? api.adminListProfessionals : null)
  const institutions = useLoad(canPlatform ? api.adminListInstitutions : null)
  const analytics = useLoad(canPlatform ? api.getAdminAnalytics : null)

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const o = overview.data

  // --- Safety ---
  const alerts = safety.data?.alerts ?? []

  // --- Verification: pending documents grouped by professional ---
  const pendingDocs = (documents.data ?? []).filter((d) => d.status === 'PENDING')
  const applicants = []
  for (const d of pendingDocs) {
    const key = d.professionalEmail || d.professionalFullName
    let row = applicants.find((a) => a.key === key)
    if (!row) {
      row = { key, name: d.professionalFullName, types: [] }
      applicants.push(row)
    }
    row.types.push(DOCUMENT_TYPES[d.type] ?? d.type)
  }

  // --- Professionals tile ---
  const verifiedCount = professionals.data ? professionals.data.filter((p) => p.verified).length : null

  // --- Bookings by tier ---
  const tierData = analytics.data?.tierBreakdown
  const maxTier = tierData ? Math.max(...TIERS.map((t) => tierData[t.key]?.count ?? 0), 1) : 1

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-600">{today}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-800">Platform overview</h1>
        </div>
        {canPlatform && (
          <Link
            to="/admin/institutions"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
          >
            Add institution
          </Link>
        )}
      </div>

      {overview.error && (
        <Card className="text-sm text-red-600">Couldn't load platform totals: {overview.error}</Card>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={o?.totalUsers} sub="All accounts" />
        <Stat label="Check-ins completed" value={o?.assessmentsCompleted} sub="All time" />
        <Stat label="Referrals made" value={o?.referralsMade} sub="All time" />
        {canProfessionals ? (
          <Stat
            label="Verified professionals"
            value={verifiedCount}
            sub={documents.data ? `${applicants.length} awaiting review` : ' '}
          />
        ) : (
          <Stat label="Professionals on network" value={o?.professionalsOnNetwork} sub=" " />
        )}
      </div>

      {/* Safety and verification */}
      {(canSafety || canProfessionals) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canSafety && (
            <Card>
              <CardTitle
                action={
                  alerts.length > 0 && (
                    <span className="text-xs font-bold text-red-700">{alerts.length} need review now</span>
                  )
                }
              >
                Safety queue
              </CardTitle>
              <Status state={safety}>
                {alerts.length === 0 ? (
                  <p className="text-sm text-ink-600">No open alerts right now.</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-3">
                        <Badge tone={LEVEL_TONES[a.level] ?? 'elevated'}>{a.level}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-navy-800">
                            User #{String(a.userId ?? '').slice(0, 8)}
                          </p>
                          <p className="truncate text-xs text-ink-600">
                            {a.note}
                            {a.createdAt ? ` · ${timeAgo(a.createdAt)}` : ''}
                          </p>
                        </div>
                        <Link to="/admin/safety" className="shrink-0 text-sm font-semibold text-navy-800 underline">
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {alerts.length > 3 && (
                  <Link to="/admin/safety" className="mt-3 inline-block text-xs font-semibold text-navy-800 underline">
                    See all {alerts.length} alerts
                  </Link>
                )}
              </Status>
            </Card>
          )}

          {canProfessionals && (
            <Card>
              <CardTitle
                action={
                  <Link to="/admin/professionals" className="text-xs font-semibold text-navy-800 underline">
                    All applications
                  </Link>
                }
              >
                Verification queue
              </CardTitle>
              <Status state={documents}>
                {applicants.length === 0 ? (
                  <p className="text-sm text-ink-600">No documents awaiting review.</p>
                ) : (
                  <div className="space-y-3">
                    {applicants.slice(0, 3).map((a) => (
                      <div key={a.key} className="rounded-xl border border-ink-100 p-4">
                        <p className="mb-2 text-sm font-bold text-navy-800">{a.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {a.types.map((t, i) => (
                            <span
                              key={`${t}-${i}`}
                              className="rounded-full bg-brand-amber-soft px-3 py-1 text-xs font-semibold text-brand-amber-text"
                            >
                              {t} pending
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Status>
            </Card>
          )}
        </div>
      )}

      {/* Institutions and tiers (Platform admin only) */}
      {canPlatform && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle
              action={
                <Link to="/admin/institutions" className="text-xs font-semibold text-navy-800 underline">
                  Manage
                </Link>
              }
            >
              Institutions
            </CardTitle>
            <Status state={institutions}>
              {(institutions.data ?? []).length === 0 ? (
                <p className="text-sm text-ink-600">No institutional partners yet.</p>
              ) : (
                <div className="divide-y divide-ink-100">
                  {(institutions.data ?? []).slice(0, 5).map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-navy-800">{i.name}</p>
                        <p className="text-xs text-ink-600">{INSTITUTION_TYPES[i.type] ?? i.type}</p>
                      </div>
                      <Badge tone={i.status === 'ACTIVE' ? 'teal' : 'neutral'}>{i.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Status>
          </Card>

          <Card>
            <CardTitle
              action={
                <Link to="/admin/analytics" className="text-xs font-semibold text-navy-800 underline">
                  Analytics
                </Link>
              }
            >
              Bookings by tier
            </CardTitle>
            <Status state={analytics}>
              {!tierData ? (
                <p className="text-sm text-ink-600">No booking data yet.</p>
              ) : (
                <div className="space-y-4">
                  {TIERS.map((t) => {
                    const count = tierData[t.key]?.count ?? 0
                    return (
                      <div key={t.key}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-bold text-navy-800">{t.label}</span>
                          <span className="text-ink-600">
                            {count} {count === 1 ? 'booking' : 'bookings'}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={`h-full rounded-full ${t.bar}`}
                            style={{ width: `${(count / maxTier) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <p className="pt-1 text-xs text-ink-600">
                    Institutions see aggregate figures only, never individual users.
                  </p>
                </div>
              )}
            </Status>
          </Card>
        </div>
      )}
    </div>
  )
}