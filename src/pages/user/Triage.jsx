import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, Smartphone, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import TriageChat from '../../components/TriageChat.jsx'
import RegistrationForm from '../../components/RegistrationForm.jsx'
import { api } from '../../data/api.js'
import { friendlyPaymentError } from '../../data/paymentMessages.js'
import { professionalTypeLabel } from '../../data/professionalTypes.js'
import {
  CARE_LEVEL_LABELS,
  URGENCY_LABELS,
  TRIAGE_STATUS_LABELS,
  TRIAGE_STATUS_TONES,
  formatKes,
  formatDateTime,
  usePrices,
} from '../../data/services.js'

const PAYMENT_POLL_MS = 3000
// Safaricom callbacks can arrive close to a minute after the PIN is entered.
const PAYMENT_POLL_TIMEOUT_MS = 120 * 1000
// An STK prompt stays open for about 60 seconds; a second tap during that
// time could make Safaricom time one of them out.
const PAY_COOLDOWN_MS = 60 * 1000
const REFRESH_MS = 8000

function CrisisBar() {
  return (
    <Disclaimer tone="urgent">
      If you are in danger right now, call <strong>999</strong> or <strong>112</strong>. Kenya Red Cross:{' '}
      <strong>1199</strong> (toll-free, 24 hours). Befrienders Kenya: <strong>+254 722 178 177</strong>{' '}
      (weekdays, 9am to 5pm).
    </Disclaimer>
  )
}

function PaySection({ triage, onUpdate }) {
  const { priceOf } = usePrices()
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [, forceTick] = useState(0)
  const pollIntervalRef = useRef(null)
  const pollTimeoutRef = useRef(null)
  const cooldownTimerRef = useRef(null)

  const paymentStatus = triage.payment?.status ?? null
  const price = priceOf('TRIAGE')

  const stopPolling = () => {
    clearInterval(pollIntervalRef.current)
    clearTimeout(pollTimeoutRef.current)
    setPolling(false)
  }

  useEffect(
    () => () => {
      clearInterval(pollIntervalRef.current)
      clearTimeout(pollTimeoutRef.current)
      clearInterval(cooldownTimerRef.current)
    },
    []
  )

  // Re-render once a second while the cooldown runs, so the countdown stays
  // accurate, then stop.
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
        .getTriage(triage.id)
        .then((result) => {
          onUpdate(result)
          const s = result.payment?.status
          if (s === 'PAID' || s === 'FAILED') stopPolling()
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
      const result = await api.getTriage(triage.id)
      onUpdate(result)
      if (result.payment?.status === 'PAID' || result.payment?.status === 'FAILED') setTimedOut(false)
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
      await api.payTriage(triage.id, phone)
      setCooldownUntil(Date.now() + PAY_COOLDOWN_MS)
      startPolling()
      handleCheckStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  const payLocked = polling || submitting || cooldownSeconds > 0

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold text-navy-800 mb-1">Pay for your triage</h3>
        <p className="text-sm text-ink-600">
          The triage fee is {price != null ? <strong>{formatKes(price)}</strong> : 'a small fixed fee'}, paid by M-Pesa.
          It is credited towards your first session, so you do not pay it twice. The amount on your phone is the final
          amount.
        </p>
      </div>

      {polling && (
        <div className="flex items-center gap-2 text-sm text-navy-700 bg-teal-50 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Check your phone and enter your M-Pesa PIN to complete payment.
        </div>
      )}

      {timedOut && paymentStatus === 'PENDING' && (
        <div className="text-sm text-navy-700 bg-amber-50 rounded-lg px-3 py-2 space-y-2">
          <p>
            We haven't received confirmation from M-Pesa yet. If you entered your PIN, please wait a moment and check
            again. If no prompt appeared on your phone, you can try again.
          </p>
          <Button type="button" variant="secondary" onClick={handleCheckStatus} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
          </Button>
        </div>
      )}

      {!polling && !timedOut && paymentStatus === 'PENDING' && (
        <div className="text-sm text-navy-700 bg-amber-50 rounded-lg px-3 py-2 space-y-2">
          <p>A payment prompt was sent earlier. If you have already paid, check the status.</p>
          <Button type="button" variant="secondary" onClick={handleCheckStatus} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
          </Button>
        </div>
      )}

      {paymentStatus === 'FAILED' && !polling && (
        <p className="text-sm text-red-600">{friendlyPaymentError(triage.payment?.resultDesc)}</p>
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
    </Card>
  )
}

export default function Triage() {
  const { id } = useParams()
  const [triage, setTriage] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    api
      .getTriage(id)
      .then((data) => {
        setTriage(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Keep the page fresh while a clinician is on the case.
  const status = triage?.status
  useEffect(() => {
    if (status !== 'QUEUED' && status !== 'IN_PROGRESS') return
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [status, load])

  if (error && !triage) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Link to="/app/triage" className="text-teal-600 font-semibold text-sm">
          Back to my triage
        </Link>
      </div>
    )
  }

  if (!triage) {
    return (
      <div className="p-4 md:p-8 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your triage...
      </div>
    )
  }

  const active = triage.status === 'QUEUED' || triage.status === 'IN_PROGRESS'
  const care = triage.care

  return (
    <div>
      <PageHeader
        eyebrow="Triage"
        title={triage.isFree ? 'Your free urgent triage' : 'Your triage'}
        subtitle="A clinician reviews your screening, chats with you, and recommends the right kind of care."
        actions={<Badge tone={TRIAGE_STATUS_TONES[triage.status]}>{TRIAGE_STATUS_LABELS[triage.status]}</Badge>}
      />

      <div className="p-4 md:p-8 max-w-2xl space-y-6">
        {(triage.status !== 'COMPLETED' || triage.careLevel !== 'EMERGENCY_REFERRAL') && <CrisisBar />}

        {triage.status === 'AWAITING_PAYMENT' && <PaySection triage={triage} onUpdate={setTriage} />}

        {active && (
          <Card className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Clock className="h-4 w-4 text-teal-600" />
              {triage.clinician
                ? `Your clinician: ${triage.clinician.fullName} (${professionalTypeLabel(triage.clinician.type)})`
                : "We're assigning a clinician to you"}
            </div>
            {triage.isFree && (
              <p className="text-sm text-ink-600">
                This urgent review is free. A clinician will look at it as a priority.
              </p>
            )}
            {triage.sponsoredBy && (
              <p className="text-sm text-ink-600">
                Your triage is covered by {triage.sponsoredBy}. There is nothing to pay.
              </p>
            )}
            {triage.status === 'QUEUED' && care?.expectedResponseBy && (
              <p className="text-sm text-ink-600">
                {care.withinServiceHours
                  ? `Expect a first reply by about ${formatDateTime(care.expectedResponseBy)}.`
                  : `Our triage clinicians reply between ${care.serviceHours}. Expect a first reply by about ${formatDateTime(
                      care.expectedResponseBy
                    )}. If you are in danger before then, use the numbers above.`}
              </p>
            )}
            {triage.status === 'IN_PROGRESS' && (
              <p className="text-sm text-ink-600">Your clinician is reviewing your case with you.</p>
            )}
            {!triage.clinician && (
              <p className="text-sm text-ink-600">
                This page updates by itself. You can message your clinician as soon as one is assigned.
              </p>
            )}
          </Card>
        )}

        {active && <RegistrationForm />}

        {(active || triage.status === 'COMPLETED') && (
          <TriageChat
            triageId={triage.id}
            role="user"
            canSend={active && Boolean(triage.clinician)}
            disabledReason={
              triage.status === 'COMPLETED'
                ? 'This triage chat is closed.'
                : 'You can message your clinician as soon as one is assigned.'
            }
          />
        )}

        {triage.status === 'COMPLETED' && (
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-teal-700 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Your triage is complete
            </div>

            {triage.careLevel === 'EMERGENCY_REFERRAL' ? (
              <Disclaimer tone="urgent">
                Your clinician recommends emergency care. Please call <strong>999</strong> or <strong>112</strong>, or go to
                the nearest hospital emergency department now. If you cannot, contact the clinician who reviewed you.
              </Disclaimer>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-ink-500">Recommended care</p>
                    <p className="font-semibold text-navy-800">{CARE_LEVEL_LABELS[triage.careLevel] ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Urgency</p>
                    <p className="font-semibold text-navy-800">{URGENCY_LABELS[triage.urgency] ?? '—'}</p>
                  </div>
                </div>
                {triage.creditKes > 0 && !triage.creditUsed && (
                  <p className="text-sm text-ink-600">
                    Your {formatKes(triage.creditKes)} triage credit will be taken off your first session.
                  </p>
                )}
                <Button as="link" to="/app/find-a-professional" variant="accent">
                  Choose a professional and book
                </Button>
              </>
            )}
          </Card>
        )}

        {triage.status === 'CANCELLED' && (
          <Card className="text-sm text-ink-600">This triage was cancelled. You can start again from a new screening.</Card>
        )}
      </div>
    </div>
  )
}
