import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle2, Clock } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import TriageChat from '../../components/TriageChat.jsx'
import RegistrationForm from '../../components/RegistrationForm.jsx'
import MpesaPrompt from '../../components/MpesaPrompt.jsx'
import { api } from '../../data/api.js'
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
  const price = triage.payment?.amountKes ?? priceOf('TRIAGE')

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold text-navy-800 mb-1">Pay for your triage</h3>
        <p className="text-sm text-ink-600">
          The triage fee is {price != null ? <strong>{formatKes(price)}</strong> : 'a small fixed fee'}, paid by M-Pesa.
          It is credited towards your first session, so you do not pay it twice. As soon as it is paid, a clinician is
          alerted to review your screening.
        </p>
      </div>
      <MpesaPrompt
        amountKes={price}
        initialStatus={triage.payment?.status ?? null}
        initialPhoneMasked={triage.payment?.phoneMasked ?? null}
        initialResultDesc={triage.payment?.resultDesc ?? null}
        send={(phone) => api.payTriage(triage.id, phone)}
        check={() =>
          api.getTriage(triage.id).then((result) => {
            onUpdate(result)
            return {
              status: result.payment?.status ?? null,
              resultDesc: result.payment?.resultDesc ?? null,
              phoneMasked: result.payment?.phoneMasked ?? null,
            }
          })
        }
      />
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
                : 'Our clinicians on call have been alerted'}
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
                The first clinician free to take your triage will pick it up. This page updates by itself, and you can
                message your clinician as soon as one has taken it.
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
                : 'You can message your clinician as soon as one has taken your triage.'
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
