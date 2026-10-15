import { useEffect, useState } from 'react'
import { CalendarDays, Loader2, Video, MapPin, Check, X, UserX, Wallet } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

const JOIN_WINDOW_BEFORE_MS = 10 * 60 * 1000 // 10 min before
const JOIN_WINDOW_AFTER_MS = 60 * 60 * 1000 // 60 min after

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString()}`
}

// What the professional actually earns for a session: the session fee minus
// Mindora's platform fee, both stored on the appointment at booking time
// (35% standard, 25% Student Rate, 0% on corporate/EAP sponsorships).
// Patients and admins see the full session fee; professionals see this.
function professionalEarnings(a) {
  return Math.max(0, (a.feeKes || 0) - (a.platformFeeKes || 0))
}

// Enforces "strictly on the time slotted" — the Join button only appears
// inside a real window around the booked time, not any time before/after.
function canJoin(a) {
  if (a.status !== 'SCHEDULED' || a.type !== 'ONLINE' || !a.meetingUrl) return false
  const start = new Date(a.scheduledFor).getTime()
  const now = Date.now()
  return now >= start - JOIN_WINDOW_BEFORE_MS && now <= start + JOIN_WINDOW_AFTER_MS
}

// Earnings line shown on each session card, with the fee breakdown so the
// professional can see exactly how the amount was worked out.
function EarningsLine({ a }) {
  const earnings = professionalEarnings(a)
  const platformFee = a.platformFeeKes || 0

  return (
    <div className="mt-2 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-teal-700">
        <Wallet className="h-3.5 w-3.5" /> You earn {formatKes(earnings)}
        {a.isStudentRateBooking && (
          <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
            Student Rate
          </span>
        )}
      </p>
      <p className="text-xs text-ink-400 mt-0.5">
        Session fee {formatKes(a.feeKes)}
        {platformFee > 0 ? ` • Mindora fee ${formatKes(platformFee)}` : ' • No platform fee'}
      </p>
    </div>
  )
}

function SessionTypeLine({ a }) {
  return (
    <p className="text-sm text-ink-500 flex items-center gap-1 mt-1">
      {a.type === 'ONLINE' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
      {a.type === 'ONLINE' ? 'Online' : 'In-person'}
    </p>
  )
}

export default function Appointments() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const load = () => {
    api
      .getProfessionalAppointments()
      .then(setData)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleStatus = async (id, status) => {
    setUpdatingId(id)
    try {
      await api.updateAppointmentStatus(id, status)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // Past sessions still marked SCHEDULED were never closed. They need
  // Mark complete / No-show so they can be settled (no Join or Cancel,
  // since the session time has already passed).
  const unclosedPast = data ? data.past.filter((a) => a.status === 'SCHEDULED') : []

  return (
    <div>
      <PageHeader eyebrow="Appointments" title="Your schedule" />

      <div className="p-8 max-w-3xl space-y-6">
        {error && <Card className="text-sm text-red-600">Couldn't load appointments: {error}</Card>}

        {data === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your schedule...
          </Card>
        )}

        {data && (
          <>
            <div>
              <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Upcoming ({data.upcoming.length})
              </h3>
              {data.upcoming.length === 0 && (
                <Card className="text-sm text-ink-400 text-center py-8">
                  No upcoming consultations booked yet.
                </Card>
              )}
              <div className="space-y-3">
                {data.upcoming.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-navy-800">{formatDateTime(a.scheduledFor)}</p>
                        <SessionTypeLine a={a} />
                        <EarningsLine a={a} />
                      </div>
                      <Badge tone={a.status === 'SCHEDULED' ? 'teal' : 'neutral'}>{a.status}</Badge>
                    </div>

                    {a.status === 'SCHEDULED' && (
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-ink-100">
                        {a.type === 'ONLINE' &&
                          (canJoin(a) ? (
                            <Button
                              as="a"
                              href={a.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="accent"
                            >
                              <Video className="h-4 w-4" /> Join meeting
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-400 mr-2">
                              Join link opens 10 min before the scheduled time
                            </span>
                          ))}
                        <Button
                          variant="secondary"
                          onClick={() => handleStatus(a.id, 'COMPLETED')}
                          disabled={updatingId === a.id}
                        >
                          <Check className="h-4 w-4" /> Mark complete
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-amber-700"
                          onClick={() => handleStatus(a.id, 'NO_SHOW')}
                          disabled={updatingId === a.id}
                        >
                          <UserX className="h-4 w-4" /> No-show
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleStatus(a.id, 'CANCELLED')}
                          disabled={updatingId === a.id}
                        >
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {data.past.length > 0 && (
              <div>
                <h3 className="font-semibold text-navy-800 mb-3">Past ({data.past.length})</h3>

                {unclosedPast.length > 0 && (
                  <Card className="mb-3 text-sm text-amber-800 bg-amber-50">
                    {unclosedPast.length === 1
                      ? '1 past session has not been marked yet.'
                      : `${unclosedPast.length} past sessions have not been marked yet.`}{' '}
                    Mark each one as complete or no-show so it can be settled.
                  </Card>
                )}

                <div className="space-y-3">
                  {data.past.map((a) => {
                    const needsClosing = a.status === 'SCHEDULED'
                    const showEarnings = needsClosing || a.status === 'COMPLETED'

                    return (
                      <Card key={a.id} className={needsClosing ? '' : 'opacity-70'}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-navy-800">{formatDateTime(a.scheduledFor)}</p>
                            <SessionTypeLine a={a} />
                            {showEarnings && <EarningsLine a={a} />}
                          </div>
                          <Badge tone={needsClosing ? 'amber' : 'neutral'}>
                            {needsClosing ? 'NOT MARKED' : a.status}
                          </Badge>
                        </div>

                        {needsClosing && (
                          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-ink-100">
                            <Button
                              variant="secondary"
                              onClick={() => handleStatus(a.id, 'COMPLETED')}
                              disabled={updatingId === a.id}
                            >
                              <Check className="h-4 w-4" /> Mark complete
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-amber-700"
                              onClick={() => handleStatus(a.id, 'NO_SHOW')}
                              disabled={updatingId === a.id}
                            >
                              <UserX className="h-4 w-4" /> No-show
                            </Button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}