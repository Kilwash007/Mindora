import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { CheckCircle2, Video, MapPin, Loader2, Building2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'
import { professionalTypeLabel } from '../../data/professionalTypes.js'
import { CARE_LEVEL_LABELS, formatKes, formatTime } from '../../data/services.js'

const pad = (n) => String(n).padStart(2, '0')

// A value for a datetime-local input, in the person's own time zone.
function localInputValue(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Sensible default: tomorrow at 10:00.
function defaultDateTime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return localInputValue(d)
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={tone === 'credit' ? 'text-teal-700 font-medium' : 'text-ink-700'}>{value}</span>
    </div>
  )
}

export default function BookConsultation() {
  const { selectedProfessional } = useAppState()
  const [dateTime, setDateTime] = useState(defaultDateTime())
  const [type, setType] = useState(selectedProfessional?.onlineAvailable === false ? 'IN_PERSON' : 'ONLINE')
  const [options, setOptions] = useState(undefined) // undefined = loading
  const [optionsError, setOptionsError] = useState(null)
  const [institution, setInstitution] = useState(undefined) // undefined = loading, null = none
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [confirmed, setConfirmed] = useState(null)

  useEffect(() => {
    api
      .getBookingOptions()
      .then(setOptions)
      .catch((err) => {
        setOptions(null)
        setOptionsError(err)
      })
    api
      .getMyInstitution()
      .then(setInstitution)
      .catch(() => setInstitution(null))
  }, [])

  if (!selectedProfessional) return <Navigate to="/app/find-a-professional" replace />

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const appointment = await api.bookSession({
        professionalId: selectedProfessional.id,
        scheduledFor: new Date(dateTime).toISOString(),
        type,
      })
      setConfirmed(appointment)
    } catch (err) {
      setError(err.message || 'Could not book this appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const header = <PageHeader eyebrow="Booking" title="Book your session" />

  if (options === undefined) {
    return (
      <div>
        {header}
        <div className="p-4 md:p-8 max-w-xl mx-auto">
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your care plan...
          </Card>
        </div>
      </div>
    )
  }

  if (optionsError) {
    return (
      <div>
        {header}
        <div className="p-4 md:p-8 max-w-xl mx-auto space-y-4">
          {optionsError.code === 'EMERGENCY_REFERRAL' ? (
            <Disclaimer tone="urgent">
              Your triage recommended emergency care. Please call <strong>999</strong> or <strong>112</strong>, or go to
              the nearest hospital emergency department. If you cannot, contact the clinician who reviewed you.
            </Disclaimer>
          ) : optionsError.code === 'TRIAGE_REQUIRED' ? (
            <Card className="space-y-4">
              <h3 className="font-semibold text-navy-800">Start with a screening and triage</h3>
              <p className="text-sm text-ink-600">
                Sessions are booked after a free screening and a triage, so a clinician can recommend the right kind of
                care for you first. {optionsError.message}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button as="link" to="/app/check-in" variant="accent">
                  Start the free screening
                </Button>
                <Button as="link" to="/app/triage" variant="secondary">
                  My triage
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="text-sm text-red-600">{optionsError.message}</Card>
          )}
        </div>
      </div>
    )
  }

  const typeOk = options.professionalTypes.includes(selectedProfessional.type)
  if (!typeOk) {
    return (
      <div>
        {header}
        <div className="p-4 md:p-8 max-w-xl mx-auto">
          <Card className="space-y-4">
            <h3 className="font-semibold text-navy-800">Please choose a different professional</h3>
            <p className="text-sm text-ink-600">
              Your triage recommended <strong>{CARE_LEVEL_LABELS[options.careLevel] ?? options.serviceLabel}</strong>.{' '}
              {selectedProfessional.fullName} is a {professionalTypeLabel(selectedProfessional.type)} and does not
              provide {options.serviceLabel}. You can book with:{' '}
              {options.professionalTypes.map(professionalTypeLabel).join(', ')}.
            </p>
            <Button as="link" to="/app/find-a-professional" variant="accent">
              Back to the directory
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // What the patient pays now. The server works this out again; this is the
  // same sum, shown before they confirm.
  const sponsorAvailable = Boolean(
    institution &&
      institution.status === 'ACTIVE' &&
      institution.coveragePercent > 0 &&
      (institution.sponsoredSessionsPerMember == null ||
        institution.sponsoredSessionsUsed < institution.sponsoredSessionsPerMember)
  )
  const coveredKes = sponsorAvailable
    ? Math.min(options.balanceKes, Math.round((options.balanceKes * institution.coveragePercent) / 100))
    : 0
  const payNowKes = options.balanceKes - coveredKes

  if (confirmed) {
    return (
      <div>
        <PageHeader eyebrow="Booking" title="Your slot is held" />
        <div className="p-4 md:p-8 max-w-xl mx-auto">
          <Card className="text-center py-10 space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-navy-800">{confirmed.serviceLabel} booked</h2>
            <p className="text-sm text-ink-500">
              {selectedProfessional.fullName} • {new Date(confirmed.scheduledFor).toLocaleString()} •{' '}
              {confirmed.type === 'ONLINE' ? 'Online' : 'In person'}
            </p>
            {confirmed.paymentRequired ? (
              <p className="text-sm text-ink-600 max-w-sm mx-auto">
                Pay the balance of <strong>{formatKes(confirmed.amountDueKes)}</strong> by M-Pesa on your Appointments
                page. Your video link appears once it is paid.
                {confirmed.holdExpiresAt &&
                  ` Your slot is held until ${formatTime(confirmed.holdExpiresAt)}, and is released if it is not paid by then.`}
              </p>
            ) : (
              <p className="text-sm text-ink-600 max-w-sm mx-auto">There is nothing to pay for this session.</p>
            )}
            <div className="pt-2">
              <Button as="link" to="/app/appointments" variant="accent">
                {confirmed.paymentRequired ? 'Go to payment' : 'View my appointments'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
        <Card>
          <p className="text-xs text-ink-500 mb-1">Professional</p>
          <p className="font-semibold text-navy-800">{selectedProfessional.fullName}</p>
          <p className="text-xs text-ink-500 mt-1">{professionalTypeLabel(selectedProfessional.type)}</p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Date and time</p>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            min={localInputValue(new Date())}
            className="w-full rounded-lg border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Session type</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType('ONLINE')}
              disabled={!selectedProfessional.onlineAvailable}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                type === 'ONLINE' ? 'border-teal-400 bg-teal-50 text-navy-800' : 'border-ink-200 text-ink-600'
              }`}
            >
              <Video className="h-4 w-4" /> Online
            </button>
            <button
              onClick={() => setType('IN_PERSON')}
              disabled={!selectedProfessional.inPersonAvailable}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                type === 'IN_PERSON' ? 'border-teal-400 bg-teal-50 text-navy-800' : 'border-ink-200 text-ink-600'
              }`}
            >
              <MapPin className="h-4 w-4" /> In-person
            </button>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Price</p>
          <Row label={options.serviceLabel} value={formatKes(options.listPriceKes)} />
          {options.triageCreditKes > 0 && (
            <Row label="Triage credit" value={`− ${formatKes(options.triageCreditKes)}`} tone="credit" />
          )}
          {coveredKes > 0 && (
            <Row label={`Covered by ${institution.name}`} value={`− ${formatKes(coveredKes)}`} tone="credit" />
          )}
          <div className="flex items-center justify-between border-t border-ink-100 pt-3">
            <span className="text-sm font-semibold text-navy-800">You pay</span>
            <span className="text-xl font-bold text-navy-800">{formatKes(payNowKes)}</span>
          </div>
          {coveredKes > 0 && (
            <div className="flex items-center gap-2 text-xs text-teal-700">
              <Building2 className="h-3.5 w-3.5" />
              {institution.coveragePercent}% of the balance is covered by {institution.name}
            </div>
          )}
          <p className="text-xs text-ink-400">
            The final amount is confirmed when you book. Pay by M-Pesa on your Appointments page.
          </p>
          <Button variant="accent" onClick={handleConfirm} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm booking'}
          </Button>
        </Card>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <p className="text-xs text-ink-400 text-center">
          Not the right service?{' '}
          <Link to="/app/triage" className="underline">
            See your triage outcome
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
