import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Video, MapPin } from 'lucide-react'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'
import { PROFESSIONAL_TYPE_OPTIONS } from '../../data/professionalTypes.js'

const JOIN_OPENS_BEFORE_MS = 10 * 60 * 1000
const JOIN_CLOSES_AFTER_MS = 60 * 60 * 1000

const RESET_STEPS = [
  '5 things you can see',
  '4 things you can touch',
  '3 things you can hear',
  '2 things you can smell',
  '1 thing you can taste',
]

// Wellbeing "score" is the inverse of the risk ratio the backend computed:
// a lower answered-severity total means a higher score out of 100.
function toScore(checkIn) {
  if (!checkIn.maxScore) return null
  return Math.round(100 - (checkIn.totalScore / checkIn.maxScore) * 100)
}

function relativeTime(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function greetingFor(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function typeLabel(value) {
  return PROFESSIONAL_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function initialsOf(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
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

// What the person should do next in their care, from their latest screening,
// their latest triage and whether they already have a session booked. The
// server decides what is allowed; this only decides what to point at.
export function careNextStep({ screening, triage, hasUpcoming, hasHistory }) {
  if (triage?.status === 'AWAITING_PAYMENT') {
    return {
      eyebrow: 'Next step',
      title: 'Finish your triage',
      text: 'Your screening is ready. Pay the small triage fee so a clinician can review it with you. It is credited to your first session.',
      to: `/app/triage/${triage.id}`,
      label: 'Continue to payment',
    }
  }
  if (triage?.status === 'QUEUED' || triage?.status === 'IN_PROGRESS') {
    return {
      eyebrow: 'Your triage',
      title: 'A clinician is on your case',
      text: 'Open it to chat with your clinician and add your details.',
      to: `/app/triage/${triage.id}`,
      label: 'Open my triage',
    }
  }
  if (triage?.status === 'COMPLETED' && !hasUpcoming) {
    if (triage.careLevel === 'EMERGENCY_REFERRAL') {
      return {
        eyebrow: 'Your triage',
        title: 'Please read your outcome',
        text: 'Your clinician has advice for you.',
        to: `/app/triage/${triage.id}`,
        label: 'Read it',
      }
    }
    return {
      eyebrow: 'Next step',
      title: 'Book your first session',
      text: 'Your triage is complete. Choose a professional and book. Your triage credit is applied for you.',
      to: '/app/find-a-professional',
      label: 'Find a professional',
    }
  }
  if (screening && !triage) {
    return {
      eyebrow: 'Next step',
      title: 'Your screening is ready',
      text: 'The next step is a triage: a clinician reads your screening with you and recommends the right care.',
      to: '/app/check-in/result',
      label: 'See my next step',
    }
  }
  return {
    eyebrow: 'Free screening',
    title: 'How are you, really?',
    text: hasHistory
      ? 'Check in on how you have been feeling. About 5 to 10 minutes, free, and your answers are confidential.'
      : '20 short questions, about 5 to 10 minutes. It is free, and your answers are confidential.',
    to: '/app/check-in',
    label: hasHistory ? 'Take a new screening' : 'Start the free screening',
  }
}

export default function Dashboard() {
  const { authUser } = useAppState()
  const firstName = authUser?.fullName?.split(' ')[0] ?? 'there'

  const history = useLoad(api.getCheckInHistory)
  const appointments = useLoad(api.getMyAppointments)
  const conversations = useLoad(api.getConversations)
  const professionals = useLoad(api.listProfessionals)
  const institution = useLoad(api.getMyInstitution)
  const latestScreening = useLoad(api.getLatestScreening)
  const myTriages = useLoad(api.getMyTriages)

  const [resetOpen, setResetOpen] = useState(false)

  const now = new Date()
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // --- Check-ins ---
  const checkIns = history.data ?? []
  const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null
  const recent = checkIns
    .map((c) => ({ score: toScore(c), at: c.completedAt }))
    .filter((c) => c.score !== null)
    .slice(-6)
  const latestScore = recent.length > 0 ? recent[recent.length - 1].score : null
  const change = recent.length > 1 ? latestScore - recent[recent.length - 2].score : null

  let changeText = ''
  if (change !== null) {
    if (change > 0) changeText = `Up ${change} points since your last screening.`
    else if (change < 0) changeText = `Down ${Math.abs(change)} points since your last screening.`
    else changeText = 'Steady since your last screening.'
  }

  // --- Next session: the earliest scheduled one that hasn't ended ---
  const next =
    (appointments.data ?? [])
      .filter(
        (a) => a.status === 'SCHEDULED' && new Date(a.scheduledFor).getTime() > Date.now() - JOIN_CLOSES_AFTER_MS
      )
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] ?? null
  const nextTime = next ? new Date(next.scheduledFor).getTime() : 0
  const canJoin =
    next &&
    next.type === 'ONLINE' &&
    next.meetingUrl &&
    Date.now() >= nextTime - JOIN_OPENS_BEFORE_MS &&
    Date.now() <= nextTime + JOIN_CLOSES_AFTER_MS

  // --- The next step in care ---
  const careStep = careNextStep({
    screening: latestScreening.data?.valid ? latestScreening.data : null,
    triage: myTriages.data?.[0] ?? null,
    hasUpcoming: Boolean(next),
    hasHistory: checkIns.length > 0,
  })

  // --- Messages: prefer a conversation with unread messages ---
  const convo = conversations.data?.find((c) => c.unreadCount > 0) ?? conversations.data?.[0] ?? null

  // --- Professionals: first three from the directory ---
  const proList = (professionals.data ?? []).filter((p) => p.verified !== false).slice(0, 3)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-600">{today}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-800">
            {greetingFor(now)}, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {institution.data?.name && (
            <span className="hidden sm:inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-xs font-semibold text-teal-800">
              {institution.data.name}
            </span>
          )}
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900"
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Row 1: the next step in care, and the next session */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-navy-800 p-7 text-white shadow-lift lg:col-span-2">
          <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 right-24 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative max-w-lg">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-amber">{careStep.eyebrow}</p>
            <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-white">{careStep.title}</h2>
            <p className="mb-6 text-sm leading-relaxed text-navy-100">
              {careStep.text}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={careStep.to}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-amber px-5 py-3 text-sm font-bold text-navy-900 transition hover:brightness-95"
              >
                {careStep.label} <ArrowRight className="h-4 w-4" />
              </Link>
              {lastCheckIn && (
                <span className="text-sm text-navy-100">Last screening: {relativeTime(lastCheckIn.completedAt)}</span>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardTitle action={next && <Badge tone="teal">{next.type === 'ONLINE' ? 'Video' : 'In person'}</Badge>}>
            Next session
          </CardTitle>
          {appointments.error && <p className="text-sm text-red-600">Couldn't load your sessions.</p>}
          {!appointments.error && appointments.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {appointments.data && !next && (
            <div>
              <p className="mb-4 text-sm text-ink-600">You have no upcoming sessions.</p>
              <Link
                to="/app/find-a-professional"
                className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 underline"
              >
                Find a professional <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          {next && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-amber-soft text-sm font-bold text-brand-amber-text"
                >
                  {initialsOf(next.professional?.fullName)}
                </div>
                <p className="min-w-0 truncate font-bold text-navy-800">{next.professional?.fullName}</p>
              </div>
              <div className="mb-4 rounded-xl bg-ink-50 px-4 py-3">
                <p className="flex items-center gap-2 text-base font-extrabold text-navy-800">
                  {next.type === 'ONLINE' ? (
                    <Video className="h-4 w-4 text-teal-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-teal-600" />
                  )}
                  {new Date(next.scheduledFor).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  {' · '}
                  {new Date(next.scheduledFor).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
                </p>
                {next.type === 'ONLINE' && !canJoin && (
                  <p className="mt-1 text-xs text-ink-600">The join link opens 10 minutes before.</p>
                )}
              </div>
              <div className="flex gap-2">
                {canJoin ? (
                  <a
                    href={next.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-navy-800 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                  >
                    Join meeting
                  </a>
                ) : (
                  <Link
                    to="/app/messages"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-navy-800 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                  >
                    Message
                  </Link>
                )}
                <Link
                  to="/app/appointments"
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-ink-200 bg-white text-sm font-semibold text-navy-800 transition-colors hover:border-navy-300"
                >
                  All sessions
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: wellbeing, messages, reset */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle
            action={
              <Link to="/app/wellbeing" className="text-xs font-semibold text-navy-800 underline">
                Journey
              </Link>
            }
          >
            Your wellbeing
          </CardTitle>
          {history.error && <p className="text-sm text-red-600">Couldn't load your screenings.</p>}
          {!history.error && history.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {history.data && recent.length === 0 && (
            <p className="text-sm text-ink-600">
              No screenings yet. Take your first free screening to start tracking your wellbeing here.
            </p>
          )}
          {recent.length > 0 && (
            <div>
              <div
                role="img"
                aria-label={`Wellbeing scores from your last ${recent.length} screenings, latest ${latestScore} out of 100`}
                className="mb-4 flex h-32 items-end gap-3 border-b border-ink-100"
              >
                {recent.map((c, i) => (
                  <div
                    key={c.at}
                    title={`${new Date(c.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${c.score}`}
                    style={{ height: `${Math.max(c.score, 6)}%` }}
                    className={`flex-1 rounded-t-md ${i === recent.length - 1 ? 'bg-navy-800' : 'bg-teal-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-ink-700">
                {changeText && <span>{changeText} </span>}
                <span className="font-bold text-navy-800">Latest: {latestScore} / 100</span>
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Messages</CardTitle>
          {conversations.error && <p className="text-sm text-red-600">Couldn't load your messages.</p>}
          {!conversations.error && conversations.data === null && <p className="text-sm text-ink-500">Loading...</p>}
          {conversations.data && !convo && (
            <p className="text-sm text-ink-600">
              No conversations yet. Once you book a session, you can message your professional here.
            </p>
          )}
          {convo && (
            <div>
              <div className="mb-4 rounded-xl bg-ink-50 p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-navy-800">{convo.professionalName}</p>
                  {convo.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-amber px-1.5 text-xs font-bold text-navy-900">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <p className="line-clamp-3 text-sm text-ink-700">{convo.lastMessage || 'No messages yet'}</p>
              </div>
              <Link to="/app/messages" className="text-sm font-semibold text-navy-800 underline">
                Open messages
              </Link>
            </div>
          )}
        </Card>

        <div className="rounded-2xl bg-brand-amber-soft p-6 shadow-soft">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-amber-text">Today's reset</p>
          <h2 className="mb-2 text-xl font-extrabold leading-tight text-navy-800">
            Try the 5-4-3-2-1 grounding exercise
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-ink-700">
            Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell and 1 you taste.
          </p>
          {resetOpen && (
            <div className="mb-4 rounded-xl bg-white/70 p-4">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-navy-800">
                {RESET_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-ink-700">Take your time. Breathe slowly between each step.</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setResetOpen((open) => !open)}
            aria-expanded={resetOpen}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            {resetOpen ? 'Hide steps' : 'Start, 2 minutes'}
          </button>
        </div>
      </div>

      {/* Row 3: professionals */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-navy-800">Professionals on Mindora</h2>
          <Link to="/app/find-a-professional" className="text-sm font-semibold text-navy-800 underline">
            See all
          </Link>
        </div>
        {professionals.error && <Card className="text-sm text-red-600">Couldn't load professionals.</Card>}
        {professionals.data === null && !professionals.error && <Card className="text-sm text-ink-500">Loading...</Card>}
        {professionals.data && proList.length === 0 && (
          <Card className="text-sm text-ink-600">No professionals are listed yet. Check back soon.</Card>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {proList.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="mb-3 flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-800"
                >
                  {initialsOf(p.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-navy-800">{p.fullName}</p>
                  <p className="truncate text-xs text-ink-600">{typeLabel(p.type)}</p>
                </div>
              </div>
              {(p.focusAreas ?? []).length > 0 && (
                <p className="mb-2 text-xs text-ink-700">{p.focusAreas.slice(0, 3).join(' · ')}</p>
              )}
              <div className="mb-4 flex items-center justify-between gap-2 text-xs text-ink-600">
                <span className="truncate">{(p.languages ?? []).join(', ')}</span>
                {p.feeKes ? (
                  <span className="shrink-0 text-sm font-bold text-navy-800">KES {p.feeKes.toLocaleString()}</span>
                ) : null}
              </div>
              <Link
                to={`/app/find-a-professional/${p.id}`}
                className="mt-auto flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white text-sm font-semibold text-navy-800 transition-colors hover:border-navy-300"
              >
                View profile
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
