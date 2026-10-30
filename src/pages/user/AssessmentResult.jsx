import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'
import { formatKes, usePrices, useTriageCover } from '../../data/services.js'

function formatDay(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : null
}

export default function AssessmentResult() {
  const { lastResult } = useAppState()
  const navigate = useNavigate()
  const { priceOf } = usePrices()
  // After a page refresh the in-memory result is gone, so fall back to the
  // latest saved screening rather than making the person start again.
  const [latest, setLatest] = useState(undefined) // undefined = not asked yet

  useEffect(() => {
    if (lastResult) return
    api
      .getLatestScreening()
      .then(setLatest)
      .catch(() => setLatest(null))
  }, [lastResult])

  useEffect(() => {
    if (!lastResult && (latest === null || (latest && !latest.valid))) {
      navigate('/app/check-in', { replace: true })
    }
  }, [lastResult, latest, navigate])

  let result = lastResult
  if (!result && latest?.valid) {
    result = {
      id: latest.id,
      riskLevel: latest.riskLevel,
      validUntil: latest.validUntil,
      substanceFlag: false,
      next: latest.riskLevel === 'ACUTE' ? 'FREE_TRIAGE' : 'PAY_TRIAGE',
      triageId: latest.triage?.id ?? null,
    }
  }

  if (!result) {
    return (
      <div className="p-8 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your result...
      </div>
    )
  }

  const triagePrice = priceOf('TRIAGE')

  switch (result.riskLevel) {
    case 'ACUTE':
      return <AcuteRisk result={result} />
    case 'HIGH':
      return <HighRisk result={result} triagePrice={triagePrice} />
    case 'ELEVATED':
      return <ElevatedRisk result={result} triagePrice={triagePrice} />
    default:
      return <LowConcern result={result} triagePrice={triagePrice} />
  }
}

// The next step for everyone except an ACUTE result: a paid triage.
function TriageStep({ result, triagePrice, intro, variant = 'accent', extra }) {
  const until = formatDay(result.validUntil)
  const coveredBy = useTriageCover()
  return (
    <Card>
      <h3 className="font-semibold text-navy-800 mb-2">Recommended next step</h3>
      <p className="text-sm text-ink-600 mb-4">{intro}</p>
      <div className="rounded-xl bg-ink-50 border border-ink-100 px-4 py-3 text-sm text-ink-600 mb-4">
        <p className="font-semibold text-navy-800 mb-1">
          Triage
          {coveredBy ? ` — free, covered by ${coveredBy}` : triagePrice != null ? ` — ${formatKes(triagePrice)}` : ''}
        </p>
        <p>
          A clinician reads your screening and chats with you for 15 to 20 minutes, then recommends the right kind
          of care and who to see.{' '}
          {coveredBy
            ? `This triage is free for you, covered by ${coveredBy}.`
            : 'The triage fee is credited to your first session.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button as="link" to={`/app/triage/new/${result.id}`} variant={variant}>
          {coveredBy ? 'Start my free triage' : `Book triage${triagePrice != null ? ` — ${formatKes(triagePrice)}` : ''}`}
        </Button>
        {extra}
      </div>
      {until && <p className="text-xs text-ink-400 mt-4">This screening is valid until {until}.</p>}
    </Card>
  )
}

function LowConcern({ result, triagePrice }) {
  return (
    <div>
      <PageHeader eyebrow="Free screening" title="Your wellbeing assessment" />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Card className="text-center py-10">
          <div className="mx-auto h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-7 w-7 text-teal-600" />
          </div>
          <Badge tone="low" className="mb-3">LOW CONCERN</Badge>
          <p className="text-ink-500 text-sm max-w-sm mx-auto">
            Your responses suggest your wellbeing is currently in a good place.
          </p>
        </Card>

        <TriageStep
          result={result}
          triagePrice={triagePrice}
          variant="secondary"
          intro="No urgent action is needed right now, and regular screenings help catch changes early. If you would still like to talk to someone, a triage is where care starts."
          extra={
            <Button as="link" to="/app/resources" variant="ghost">
              View wellbeing resources
            </Button>
          }
        />

        <Disclaimer>
          This assessment is not a diagnosis. Mindora uses screening to help guide appropriate
          next steps.
        </Disclaimer>
      </div>
    </div>
  )
}

function ElevatedRisk({ result, triagePrice }) {
  const { substanceFlag } = result
  return (
    <div>
      <PageHeader
        eyebrow="Free screening"
        title={
          substanceFlag
            ? 'Your results suggest support around alcohol or drug use may help.'
            : 'Your results suggest additional support may help.'
        }
      />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Card className="text-center py-10 border-amber-200">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <Badge tone="elevated" className="mb-3">ELEVATED CONCERN</Badge>
          <p className="text-ink-600 text-sm max-w-md mx-auto">
            {substanceFlag
              ? 'Your responses indicate a concern related to alcohol or drug use. Reaching out for support is a strong step, and there is no judgment here.'
              : 'Some of your responses indicate that speaking with a qualified mental-health professional may be appropriate.'}
          </p>
        </Card>

        {substanceFlag && (
          <Disclaimer>
            NACADA's free, confidential helpline offers 24-hour support specifically for alcohol
            and drug use — counseling and referrals to treatment, day or night:{' '}
            <a href="tel:1192" className="underline font-semibold">
              1192
            </a>
            .
          </Disclaimer>
        )}

        <TriageStep
          result={result}
          triagePrice={triagePrice}
          intro="A triage is the first step: a clinician looks at your answers with you and recommends the support that fits."
          extra={
            <Button as="link" to="/app/resources" variant="secondary">
              Learn more
            </Button>
          }
        />

        <Disclaimer>
          This assessment is not a diagnosis. Mindora uses screening to help guide you toward
          appropriate, professional next steps.
        </Disclaimer>
      </div>
    </div>
  )
}

function HighRisk({ result, triagePrice }) {
  return (
    <div>
      <PageHeader eyebrow="Free screening" title="Your results suggest you should speak with a professional soon." />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Card className="text-center py-10 border-orange-200">
          <div className="mx-auto h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <ShieldAlert className="h-7 w-7 text-orange-600" />
          </div>
          <Badge tone="high" className="mb-3">HIGH CONCERN</Badge>
          <p className="text-ink-600 text-sm max-w-md mx-auto">
            Your responses indicate a significant level of concern. A prompt clinical assessment
            is recommended.
          </p>
        </Card>

        <TriageStep
          result={result}
          triagePrice={triagePrice}
          intro="Given the level of concern, we recommend starting your triage as soon as you can, so a clinician can review your answers and decide the right level of care, including whether to see a psychiatrist."
          extra={
            <Button as="link" to="/app/resources" variant="secondary">
              View resources
            </Button>
          }
        />

        <Disclaimer tone="urgent">
          If you are in immediate danger or believe you may harm yourself or someone else, please
          call Kenya's emergency line at 999 or 112, or go to the nearest hospital emergency
          department.
        </Disclaimer>

        <Disclaimer>
          This assessment is not a diagnosis. A member of the Mindora clinical safety team may
          also follow up given this result.
        </Disclaimer>
      </div>
    </div>
  )
}

function AcuteRisk({ result }) {
  return (
    <div>
      <PageHeader eyebrow="Free screening" title="Please reach out for support right now." />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Card className="text-center py-10 border-red-200 bg-red-50/40">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertOctagon className="h-7 w-7 text-red-600" />
          </div>
          <Badge tone="acute" className="mb-3">ACUTE CONCERN</Badge>
          <p className="text-ink-700 text-sm max-w-md mx-auto">
            Some of your responses suggest you may be going through something serious right now.
            You don't have to go through this alone.
          </p>
        </Card>

        <Disclaimer tone="urgent">
          If you are in immediate danger, please call Kenya's emergency line at 999 or 112, or go
          to the nearest hospital emergency department. For confidential suicide-prevention
          support, Befrienders Kenya can be reached by call, SMS, or WhatsApp at{' '}
          <a href="tel:+254722178177" className="underline font-semibold">
            +254 722 178 177
          </a>{' '}
          (Monday–Friday, 9am–5pm). Outside those hours, Kenya Red Cross's toll-free line,{' '}
          <a href="tel:1199" className="underline font-semibold">
            1199
          </a>
          , is available anytime.
        </Disclaimer>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Free urgent review</h3>
          <p className="text-sm text-ink-600 mb-4">
            A Mindora clinical safety reviewer has been notified, and we have opened a{' '}
            <strong>free</strong> urgent triage for you. A clinician will review your screening as a priority and
            chat with you. There is nothing to pay.
          </p>
          {result.triageId ? (
            <Button as="link" to={`/app/triage/${result.triageId}`} variant="accent">
              Open my urgent triage
            </Button>
          ) : (
            <Button as="link" to={`/app/triage/new/${result.id}`} variant="accent">
              Start my free urgent triage
            </Button>
          )}
        </Card>

        <Disclaimer>
          This assessment is not a diagnosis. It exists to connect you with real, qualified
          support as quickly as possible.
        </Disclaimer>
      </div>
    </div>
  )
}
