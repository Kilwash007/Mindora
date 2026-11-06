import { useEffect, useRef, useState } from 'react'
import { Loader2, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react'
import Button from './Button.jsx'
import { friendlyPaymentError } from '../data/paymentMessages.js'
import { formatKes } from '../data/services.js'

// One M-Pesa STK payment, sent automatically.
//
// When `autoSend` is on and nothing has been sent yet, the prompt goes out as
// soon as this appears, to the phone saved on the patient's registration
// (`send()` is called with no number). The patient then only has to enter
// their PIN. They can resend, or send to a different number. If no number is
// saved, the server answers PHONE_REQUIRED and the number box is shown.
//
// Props:
//   send(phone?)  -> Promise<{ phoneMasked? }>   starts the prompt
//   check()       -> Promise<{ status, resultDesc, phoneMasked? }>  latest state
//   amountKes     amount shown to the patient (the server decides the real one)
//   initialStatus null | 'PENDING' | 'PAID' | 'FAILED'
//   initialPhoneMasked  where an earlier prompt went, if any
//   initialResultDesc   M-Pesa's reason, when an earlier prompt failed
//   autoSend      send on first show when nothing was sent yet
//   onPaid(result)      called once when the payment is confirmed

const POLL_MS = 3000
// Safaricom callbacks can arrive close to a minute after the PIN is entered.
const POLL_TIMEOUT_MS = 120 * 1000
// Matches the server's 2-minute guard: a prompt stays open on the phone for
// about a minute, and a second one sent too soon could leave the first one's
// payment with nothing to match against.
const RESEND_COOLDOWN_MS = 120 * 1000

export default function MpesaPrompt({
  send,
  check,
  amountKes,
  initialStatus = null,
  initialPhoneMasked = null,
  initialResultDesc = null,
  autoSend = true,
  onPaid,
}) {
  // phase: idle | sending | waiting | timeout | paid | failed | needPhone
  const [phase, setPhase] = useState(() => {
    if (initialStatus === 'PAID') return 'paid'
    if (initialStatus === 'FAILED') return 'failed'
    if (initialStatus === 'PENDING') return 'timeout'
    return autoSend ? 'sending' : 'needPhone'
  })
  const [phoneMasked, setPhoneMasked] = useState(initialPhoneMasked)
  const [resultDesc, setResultDesc] = useState(initialResultDesc)
  const [showNumber, setShowNumber] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [, tick] = useState(0)

  const pollRef = useRef(null)
  const pollStopRef = useRef(null)
  const sentOnceRef = useRef(false)
  const paidRef = useRef(initialStatus === 'PAID')
  const mountedRef = useRef(true)

  const stopPolling = () => {
    clearInterval(pollRef.current)
    clearTimeout(pollStopRef.current)
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [])

  // Keep the resend countdown moving.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const t = setInterval(() => {
      tick((n) => n + 1)
      if (Date.now() >= cooldownUntil) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownUntil])

  const applyResult = (result) => {
    if (!mountedRef.current || !result) return
    if (result.phoneMasked) setPhoneMasked(result.phoneMasked)
    if (result.status === 'PAID') {
      stopPolling()
      setPhase('paid')
      if (!paidRef.current) {
        paidRef.current = true
        onPaid?.(result)
      }
    } else if (result.status === 'FAILED') {
      stopPolling()
      setResultDesc(result.resultDesc ?? null)
      setPhase('failed')
    }
  }

  const startPolling = () => {
    stopPolling()
    setPhase('waiting')
    pollRef.current = setInterval(() => {
      check().then(applyResult).catch(() => {})
    }, POLL_MS)
    pollStopRef.current = setTimeout(() => {
      clearInterval(pollRef.current)
      if (mountedRef.current && !paidRef.current) setPhase((p) => (p === 'waiting' ? 'timeout' : p))
    }, POLL_TIMEOUT_MS)
  }

  const doSend = async (typedPhone) => {
    if (Date.now() < cooldownUntil) return
    setError(null)
    setResultDesc(null)
    setPhase('sending')
    try {
      const result = await send(typedPhone || undefined)
      if (!mountedRef.current) return
      if (result?.phoneMasked) setPhoneMasked(result.phoneMasked)
      setShowNumber(false)
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
      startPolling()
    } catch (err) {
      if (!mountedRef.current) return
      if (err.code === 'PHONE_REQUIRED') {
        setPhase('needPhone')
        setShowNumber(true)
      } else if (err.code === 'PAYMENT_PENDING') {
        // A prompt is already on its way; just wait for it.
        setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
        startPolling()
      } else {
        setError(err.message || 'Could not send the M-Pesa prompt. Please try again.')
        setPhase('failed')
        setShowNumber(true)
      }
    }
  }

  // Send automatically the first time, when nothing was sent before.
  useEffect(() => {
    if (!autoSend || initialStatus != null || sentOnceRef.current) return
    sentOnceRef.current = true
    doSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheck = async () => {
    setChecking(true)
    setError(null)
    try {
      const result = await check()
      applyResult(result)
      if (result?.status === 'PENDING') setPhase('timeout')
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const handleNumberSubmit = (e) => {
    e.preventDefault()
    if (phone.trim()) doSend(phone.trim())
  }

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  const amountText = amountKes != null ? formatKes(amountKes) : 'the amount shown'

  if (phase === 'paid') {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
        <CheckCircle2 className="h-4 w-4" /> Payment received. Thank you.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {phase === 'sending' && (
        <div className="flex items-center gap-2 text-sm text-navy-700 bg-teal-50 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Sending an M-Pesa prompt to your phone...
        </div>
      )}

      {phase === 'waiting' && (
        <div className="text-sm text-navy-700 bg-teal-50 rounded-lg px-3 py-2 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            {phoneMasked ? `We've sent a ${amountText} prompt to ${phoneMasked}.` : `We've sent a ${amountText} prompt to your phone.`}
          </div>
          <p>Enter your M-Pesa PIN on your phone to pay. This page updates by itself.</p>
        </div>
      )}

      {phase === 'timeout' && (
        <div className="text-sm text-navy-700 bg-amber-50 rounded-lg px-3 py-2 space-y-2">
          <p>
            {phoneMasked ? `A prompt was sent to ${phoneMasked}. ` : 'A prompt was sent to your phone. '}
            We haven't had confirmation from M-Pesa yet. If you entered your PIN, check the status. If no prompt
            appeared, send it again.
          </p>
          <Button type="button" variant="secondary" onClick={handleCheck} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
          </Button>
        </div>
      )}

      {phase === 'failed' && !error && (
        <p className="text-sm text-red-600">{friendlyPaymentError(resultDesc)}</p>
      )}

      {phase === 'needPhone' && (
        <p className="text-sm text-ink-600">Enter the M-Pesa number to send the {amountText} prompt to.</p>
      )}

      {phase !== 'sending' && phase !== 'needPhone' && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={phase === 'waiting' ? 'secondary' : 'accent'}
            onClick={() => doSend()}
            disabled={cooldownSeconds > 0}
          >
            {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : phase === 'waiting' ? "Didn't get it? Resend" : 'Send the prompt again'}
          </Button>
          {!showNumber && (
            <Button type="button" variant="secondary" onClick={() => setShowNumber(true)}>
              Use a different number
            </Button>
          )}
        </div>
      )}

      {showNumber && (
        <form onSubmit={handleNumberSubmit} className="flex gap-2">
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
          <Button type="submit" variant="accent" disabled={!phone.trim() || cooldownSeconds > 0 || phase === 'sending'}>
            {phase === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Send prompt'}
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
