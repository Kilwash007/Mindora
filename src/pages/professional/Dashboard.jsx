import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Video, MapPin } from 'lucide-react'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'

const JOIN_OPENS_BEFORE_MS = 10 * 60 * 1000
const JOIN_CLOSES_AFTER_MS = 60 * 60 * 1000

// A referral is "waiting" until the professional has accepted it. Escalated
// and closed referrals are no longer waiting on this professional.
const WAITING_STATUSES = ['PENDING', 'MORE_INFO_REQUESTED']

function greetingFor(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// "Dr Jane Mwangi" becomes "Dr Jane"; "Grace Atieno" becomes "Grace".
function displayName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1 && /^(dr|prof)\.?$/i.test(parts[0])) return `${parts[0]} ${parts[1]}`
  return parts[0] ?? 'there'
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function ageLabel(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hours`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}

function money(n) {
  return `KES ${Number(n || 0).toLocaleString()}`
}

// Loads one thing from the API. A failure in one card never breaks the others.
function useLoad(fetcher) {
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
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

function canJoin(a) {
  if (a.status !== 'SCHEDULED' || a.type !== 'ONLINE' || !a.meetingUrl) return false
  const t = new Date(a.scheduledFor).getTime()
  const now = Date.now()
  return now >= t - JOIN_OPENS_BEFORE_MS && now <= t + JOIN_CLOSES_AFTER_MS
}

function SessionAction({ a }) {
  if (canJoin(a)) {
    return (
      <a
        href={a.meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-navy-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
      >
        Join
      </a>
    )
  }
  if (a.status === 'SCHEDULED' && new Date(a.scheduledFor).getTime() < Date.now()) {
    return (
      <Link
        to="/pro/appointments"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-300"
      >
        Mark
      </Link>
    )
  }
  if (a.status === 'COMPLETED') return <Badge tone="teal">Completed</Badge>
  if (a.status === 'NO_SHOW') return <Badge tone="neutral">No-show</Badge>
  return <Badge tone="neutral">Upcoming</Badge>
}

export default function ProfessionalDashboard() {
  const { authUser } = useAppState()
  const name = displayName(authUser?.fullName)

  const appointments = useLoad(api.getProfessionalAppointments)
  const referrals = useLoad(api.listReferrals)
  const clients = useLoad(api.listClients)
  const payouts = useLoad(api.getMyPayouts)
  const conversations = useLoad(api.getConversations)
  const profile = useLoad(api.getMyProfile)

  const now = new Date()
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // --- Appointments ---
  const all = [...(appointments.data?.upcoming ?? []), ...(appointments.data?.past ?? [])]
  const todays = all
    .filter((a) => a.status !== 'CANCELLED' && sameDay(new Date(a.scheduledFor), now))
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
  const nextToday = todays.find((a) => a.status === 'SCHEDULED' && new Date(a.scheduledFor).getTime() > Date.now())
  const completedThisMonth = all.filter(
    (a) => a.status === 'COMPLETED' && sameMonth(new Date(a.scheduledFor), now)
  ).length

  // --- Referrals waiting for a response ---
  const waiting = (referrals.data ?? []).filter((r) => WAITING_STATUSES.includes(r.status))
  const dated = waiting.filter((r) => r.createdAt)
  const oldest = dated.length > 0 ? dated.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)) : null

  // --- Messages ---
  const unread = (conversations.data ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const shownConvos = [...(conversations.data ?? [])]
    .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0))
    .slice(0, 2)

  // --- Earnings ---
  const owed = payouts.data?.owedKes
  const paidOut = (payouts.data?.payouts ?? []).reduce((sum, p) => sum + (p.amountKes || 0), 0)

  const verified = profile.data?.verified

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-600">{today}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-800">
            {greetingFor(now)}, {name}
          </h1>
        </div>
        {verified === true && (
          <span className="inline-flex items-center rounded-full bg-teal-100 px-4 py-1.5 text-xs font-semibold text-teal-800">
            Verified professional
          </span>
        )}
        {verified === false && (
          <span className="inline-flex items-center rounded-full bg-brand-amber-soft px-4 py-1.5 text-xs font-semibold text-brand-amber-text">
            Verification pending
          </span>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Today's sessions"
          value={appointments.data ? todays.length : null}
          sub={nextToday ? `Next at ${timeLabel(nextToday.scheduledFor)}` : 'Nothing else today'}
        />
        <Stat
          label="Clients"
          value={clients.data ? clients.data.length : null}
          sub="In your caseload"
        />
        <Stat
          label="Referrals waiting"
          value={referrals.data ? waiting.length : null}
          sub={oldest ? `Oldest: ${ageLabel(oldest.createdAt)}` : 'Awaiting your review'}
        />
        <Stat
          label="Unread messages"
          value={conversations.data ? unread : null}
          sub="Reply when you can"
        />
      </div>

      {/* Sessions and referrals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            action={
              <Link to="/pro/appointments" className="text-xs font-semibold text-navy-800 underline">
                Full schedule
              </Link>
            }
          >
            Today's sessions
          </CardTitle>
          {appointments.error && <p className="text-sm text-red-600">Couldn't load your schedule.</p>}
          {!appointments.error && appointments.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {appointments.data && todays.length === 0 && (
            <p className="text-sm text-ink-600">No sessions today.</p>
          )}
          <div className="space-y-3">
            {todays.map((a) => (
              <div key={a.id} className="flex items-center gap-4 rounded-xl bg-ink-50 px-4 py-3">
                <p className="w-16 shrink-0 text-center text-base font-extrabold leading-tight text-navy-800">
                  {timeLabel(a.scheduledFor)}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-navy-800">
                    {a.type === 'ONLINE' ? (
                      <Video className="h-3.5 w-3.5 text-teal-600" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                    )}
                    {a.type === 'ONLINE' ? 'Video session' : 'In-person session'}
                  </p>
                  {a.isStudentRateBooking && <p className="text-xs text-ink-600">Student Rate</p>}
                </div>
                <SessionAction a={a} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle
            action={
              <Link to="/pro/referrals" className="text-xs font-semibold text-navy-800 underline">
                All referrals
              </Link>
            }
          >
            New referrals
          </CardTitle>
          {referrals.error && <p className="text-sm text-red-600">Couldn't load your referrals.</p>}
          {!referrals.error && referrals.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {referrals.data && waiting.length === 0 && (
            <p className="text-sm text-ink-600">No referrals waiting. New Mindora referrals will show up here.</p>
          )}
          <div className="space-y-3">
            {waiting.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-100 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-800">New Mindora referral</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">{r.reason}</p>
                  </div>
                  <Badge tone={r.riskLevel === 'ACUTE' ? 'acute' : r.riskLevel === 'HIGH' ? 'high' : 'elevated'}>
                    {r.riskLevel}
                  </Badge>
                </div>
                <Link
                  to={`/pro/referrals/${r.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 underline"
                >
                  Review referral <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Earnings and messages */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white shadow-lift">
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-white">Earnings</h2>
              <Link to="/pro/earnings" className="text-xs font-semibold text-navy-100 underline">
                Details
              </Link>
            </div>
            {payouts.error && <p className="text-sm text-red-200">Couldn't load your earnings.</p>}
            {!payouts.error && payouts.data === null && <p className="text-sm text-navy-100">Loading...</p>}
            {payouts.data && (
              <div>
                <p className="text-sm text-navy-100">Owed to you now</p>
                <p className="mb-4 text-4xl font-extrabold tracking-tight text-white">{money(owed)}</p>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-navy-100">
                  <p>
                    Paid out so far: <span className="font-bold text-brand-amber">{money(paidOut)}</span>
                  </p>
                  <p>
                    Completed this month: <span className="font-bold text-white">{completedThisMonth}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardTitle
            action={
              <Link to="/pro/messages" className="text-xs font-semibold text-navy-800 underline">
                Open inbox
              </Link>
            }
          >
            Messages
          </CardTitle>
          {conversations.error && <p className="text-sm text-red-600">Couldn't load your messages.</p>}
          {!conversations.error && conversations.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {conversations.data && shownConvos.length === 0 && (
            <p className="text-sm text-ink-600">No conversations yet. Once a client books with you, you can message them here.</p>
          )}
          <div className="space-y-3">
            {shownConvos.map((c) => (
              <div key={c.userId} className="rounded-xl bg-ink-50 px-4 py-3">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-navy-800">{c.userName}</p>
                  {c.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-amber px-1.5 text-xs font-bold text-navy-900">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-ink-700">{c.lastMessage || 'No messages yet'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}