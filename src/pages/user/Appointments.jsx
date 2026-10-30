import { useEffect, useRef, useState } from 'react'
import { Loader2, Video, MapPin, Star, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

const JOIN_WINDOW_BEFORE_MS = 10 * 60 * 1000
const JOIN_WINDOW_AFTER_MS = 60 * 60 * 1000
const PAYMENT_POLL_MS = 3000
// Safaricom callbacks can arrive close to a minute after the PIN is
// entered, so we keep checking for two minutes before giving up.
const PAYMENT_POLL_TIMEOUT_MS = 120 * 1000
// An STK prompt stays open on the phone for about 60 seconds. Blocking a
// second "Pay" tap for that long stops overlapping prompts, which can make
// Safaricom time one of them out.
const PAY_COOLDOWN_MS = 60 * 1000

// Patient ratings are switched off following clinical feedback. They only
// reappear if VITE_REVIEWS_ENABLED=true is set at build time AND the backend
// has REVIEWS_ENABLED=true.
const REVIEWS_ENABLED = import.meta.env.VITE_REVIEWS_ENABLED === 'true'

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function canJoin(a) {
  if (a.status !== 'SCHEDULED' || a.type !== 'ONLINE' || !a.meetingUrl) return false
  const start = new Date(a.scheduledFor).getTime()
  const now = Date.now()
  return now >= start - JOIN_WINDOW_BEFORE_MS && now <= start + JOIN_WINDOW_AFTER_MS
}

// Turns Safaricom's technical result messages into plain language.
function friendlyPaymentError(resultDesc) {
  const text = (resultDesc || '').toLowerCase()
  if (text.includes('cancel')) {
    return 'The payment was cancelled on your phone. You can try again whenever you are ready.'
  }
  if (text.includes('timeout') || text.includes('no response') || text.includes('cannot be reached')) {
    return "We didn't get a response from your phone. Make sure it is on and has network, then try again and enter your M-Pesa PIN when prompted."
  }
  if (text.includes('insufficient') || text.includes('balance')) {
    return 'Your M-Pesa balance was not enough for this payment. Please top up and try again.'
  }
  if (text.includes('pin') || text.includes('initiator')) {
    return 'The M-Pesa PIN entered was not accepted. Please try again.'
  }
  return 'The payment did not go through. Please try again.'
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <Star className={`h-6 w-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}`} />
        </button>
      ))}
    </div>
  )
}

function ReviewSection({ appointmentId }) {
  const [existingReview, setExistingReview] = useState(undefined) // undefined = loading
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getMyReviewForAppointment(appointmentId)
      .then(setExistingReview)
      .catch(() => setExistingReview(null))
  }, [appointmentId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const review = await api.submitReview(appointmentId, rating, comment || undefined)
      setExistingReview(review)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (existingReview === undefined) return null

  if (existingReview) {
    return (
      <div className="pt-3 border-t border-ink-100">
        <p className="text-xs text-ink-500 mb-1">Your review</p>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-4 w-4 ${n <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}`}
            />
          ))}
        </div>
        {existingReview.comment && <p className="text-sm text-ink-600">{existingReview.comment}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="pt-3 border-t border-ink-100 space-y-2">
      <p className="text-xs text-ink-500">Leave a review (shown anonymously)</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" variant="secondary" disabled={rating === 0 || submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit review'}
      </Button>
    </form>
  )
}

function PaymentSection({ appointment }) {
  const [status, setStatus] = useState(null) // null = loading
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [, forceTick] = useState(0)
  const pollTimeoutRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const cooldownTimerRef = useRef(null)

  const amountDue = appointment.feeKes - appointment.institutionCoveredKes

  const stopPolling = () => {
    clearInterval(pollIntervalRef.current)
    clearTimeout(pollTimeoutRef.current)
    setPolling(false)
  }

  const loadStatus = () => {
    api
      .getPaymentStatus(appointment.id)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadStatus()
    return () => {
      clearInterval(pollIntervalRef.current)
      clearTimeout(pollTimeoutRef.current)
      clearInterval(cooldownTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id])

  // Re-render once a second while the cooldown runs, so the countdown on
  // the button stays accurate, then stop.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    cooldownTimerRef.current = setInterval(() => {
      if (Date.now() >= cooldownUntil) clearInterval(cooldownTimerRef.current)
      forceTick((n) => n + 1)
    }, 1000)
    return () => clearInterval(cooldownTimerRef.current)
  }, [cooldownUntil])

  const startPolling = () => {
    setPolling(true)
    setTimedOut(false)
    pollIntervalRef.current = setInterval(() => {
      api
        .getPaymentStatus(appointment.id)
        .then((result) => {
          setStatus(result)
          if (result.status === 'PAID' || result.status === 'FAILED') stopPolling()
        })
        .catch(() => {})
    }, PAYMENT_POLL_MS)
    pollTimeoutRef.current = setTimeout(() => {
      clearInterval(pollIntervalRef.current)
      setPolling(false)
      setTimedOut(true)
    }, PAYMENT_POLL_TIMEOUT_MS)
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    setError(null)
    try {
      const result = await api.getPaymentStatus(appointment.id)
      setStatus(result)
      if (result.status === 'PAID' || result.status === 'FAILED') setTimedOut(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (polling || Date.now() < cooldownUntil) return
    setSubmitting(true)
    setError(null)
    setTimedOut(false)
    try {
      await api.initiatePayment(appointment.id, phone)
      setStatus({ status: 'PENDING' })
      setCooldownUntil(Date.now() + PAY_COOLDOWN_MS)
      startPolling()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (amountDue <= 0 || status === null) return null

  if (status.status === 'PAID') {
    return (
      <div className="pt-3 border-t border-ink-100 flex items-center gap-2 text-sm text-teal-700">
        <CheckCircle2 className="h-4 w-4" /> Paid
        {status.mpesaReceiptNumber && (
          <span className="text-ink-400 font-mono text-xs">· {status.mpesaReceiptNumber}</span>
        )}
      </div>
    )
  }

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  const payLocked = polling || submitting || cooldownSeconds > 0

  return (
    <div className="pt-3 border-t border-ink-100 space-y-2">
      <p className="text-xs text-ink-500">Pay KES {amountDue.toLocaleString()} via M-Pesa</p>
      {appointment.holdExpiresAt && (
        <p className="text-xs text-amber-700">
          Your slot is held until{' '}
          {new Date(appointment.holdExpiresAt).toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
          . Pay before then to keep it.
        </p>
      )}

      {polling && (
        <div className="flex items-center gap-2 text-sm text-navy-700 bg-teal-50 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Check your phone and enter your M-Pesa PIN to complete payment.
        </div>
      )}

      {timedOut && status.status === 'PENDING' && (
        <div className="text-sm text-navy-700 bg-amber-50 rounded-lg px-3 py-2 space-y-2">
          <p>
            We haven't received confirmation from M-Pesa yet. If you entered your PIN, please wait a moment and
            check again. If no prompt appeared on your phone, you can try again.
          </p>
          <Button type="button" variant="secondary" onClick={handleCheckStatus} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
          </Button>
        </div>
      )}

      {status.status === 'FAILED' && !polling && (
        <p className="text-xs text-red-600">{friendlyPaymentError(status.resultDesc)}</p>
      )}

      {!polling && (
        <form onSubmit={handlePay} className="flex gap-2">
          <div className="flex-1 relative">
            <Smartphone className="h-4 w-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-ink-200 pl-9 pr-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </div>
          <Button type="submit" variant="accent" disabled={payLocked || !phone}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cooldownSeconds > 0 ? (
              `Wait ${cooldownSeconds}s`
            ) : (
              'Pay'
            )}
          </Button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Appointments() {
  const [appointments, setAppointments] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getMyAppointments()
      .then((data) => !cancelled && setAppointments(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader eyebrow="Appointments" title="Your appointments" />
      <div className="p-4 md:p-8 max-w-2xl space-y-4">
        {error && <Card className="text-sm text-red-600">Couldn't load appointments: {error}</Card>}

        {appointments === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your appointments...
          </Card>
        )}

        {appointments && appointments.length === 0 && (
          <Card className="text-center py-16 text-ink-500 text-sm">
            No appointments booked yet. Find a professional to get started.
          </Card>
        )}

        {appointments?.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-navy-800">{a.professional.fullName}</p>
                <p className="text-sm text-ink-500 mt-1">{formatDateTime(a.scheduledFor)}</p>
                <p className="text-xs text-ink-400 flex items-center gap-1 mt-1">
                  {a.type === 'ONLINE' ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  {a.type === 'ONLINE' ? 'Online' : 'In-person'} • KES {a.feeKes.toLocaleString()}
                  {a.triageCreditKes > 0 && (
                    <span className="text-teal-600">
                      {' '}
                      (KES {a.triageCreditKes.toLocaleString()} triage credit applied)
                    </span>
                  )}
                  {a.institutionCoveredKes > 0 && (
                    <span className="text-teal-600">
                      {' '}
                      (KES {a.institutionCoveredKes.toLocaleString()} covered)
                    </span>
                  )}
                </p>
              </div>
              <Badge tone={a.status === 'SCHEDULED' ? 'teal' : 'neutral'}>{a.status}</Badge>
            </div>

            {a.status === 'SCHEDULED' && <PaymentSection appointment={a} />}

            {a.status === 'SCHEDULED' && a.type === 'ONLINE' && (
              <div className="pt-3 border-t border-ink-100">
                {canJoin(a) ? (
                  <Button as="a" href={a.meetingUrl} target="_blank" rel="noopener noreferrer" variant="accent">
                    <Video className="h-4 w-4" /> Join meeting
                  </Button>
                ) : (
                  <p className="text-xs text-ink-400">
                    {a.meetingUrl
                      ? 'Join link opens 10 minutes before your scheduled time.'
                      : 'Your video link appears here once the balance is paid.'}
                  </p>
                )}
              </div>
            )}

            {REVIEWS_ENABLED && a.status === 'COMPLETED' && <ReviewSection appointmentId={a.id} />}
          </Card>
        ))}
      </div>
    </div>
  )
}
