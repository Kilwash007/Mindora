import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Flag, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { api } from '../../data/api.js'

const FREQUENCY_LABELS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

// Maximum score per answer, by questionnaire. CAGE-AID answers are yes/no.
const DOMAINS = {
  PHQ9: { label: 'Depression (PHQ-9)', itemMax: 3 },
  GAD7: { label: 'Anxiety (GAD-7)', itemMax: 3 },
  CAGEAID: { label: 'Alcohol & drug use (CAGE-AID)', itemMax: 1 },
}

const RISK_TONES = { LOW: 'low', ELEVATED: 'elevated', HIGH: 'high', ACUTE: 'acute' }
const STATUS_TONES = { ACCEPTED: 'teal', ESCALATED: 'high', CLOSED: 'neutral' }

function summarise(answers) {
  const byDomain = {}
  for (const a of answers) {
    if (!byDomain[a.domain]) byDomain[a.domain] = { total: 0, count: 0 }
    byDomain[a.domain].total += Number(a.value) || 0
    byDomain[a.domain].count += 1
  }
  return Object.entries(byDomain).map(([key, d]) => {
    const meta = DOMAINS[key] ?? { label: key, itemMax: 3 }
    return { key, label: meta.label, total: d.total, max: d.count * meta.itemMax }
  })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReferralDetail() {
  const { id } = useParams()
  const [referral, setReferral] = useState(null)
  const [error, setError] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getReferral(id)
      .then((data) => !cancelled && setReferral(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [id])

  const handleAccept = async () => {
    setAccepting(true)
    setActionError(null)
    try {
      const updated = await api.acceptReferral(id)
      setReferral((r) => ({ ...r, status: updated?.status ?? 'ACCEPTED' }))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <p className="mb-2 text-sm text-red-600">{error}</p>
        <Link to="/pro" className="text-sm font-semibold text-navy-800 underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (!referral) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-ink-500 md:p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading referral...
      </div>
    )
  }

  const checkIn = referral.checkIn ?? {}
  const answers = checkIn.answers ?? []
  const summaries = summarise(answers)
  const selfHarm = answers.find((a) => a.questionId === 'phq9_9')
  const selfHarmValue = selfHarm ? Number(selfHarm.value) || 0 : null
  const flags = (referral.flags ?? []).map((f) => (typeof f === 'string' ? f : f.label)).filter(Boolean)
  const who = referral.userId ?? checkIn.userId
  const accepted = referral.status === 'ACCEPTED'
  const closed = referral.status === 'CLOSED'

  return (
    <div>
      <PageHeader
        eyebrow="Referral"
        title="Referral summary"
        subtitle={who ? `Anonymous User #${String(who).slice(0, 8)}` : 'Anonymous user'}
      />

      <div className="grid max-w-5xl gap-6 p-4 md:p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-navy-800">Screening summary</h3>
              <div className="flex items-center gap-2">
                {referral.status && (
                  <Badge tone={STATUS_TONES[referral.status] ?? 'elevated'}>{referral.status}</Badge>
                )}
                {checkIn.riskLevel && (
                  <Badge tone={RISK_TONES[checkIn.riskLevel] ?? 'elevated'}>{checkIn.riskLevel}</Badge>
                )}
              </div>
            </div>

            {summaries.length === 0 && (
              <p className="text-sm text-ink-500">No item-level answers are available for this check-in.</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {summaries.map((s) => (
                <div key={s.key} className="rounded-lg bg-ink-50 px-4 py-3">
                  <p className="mb-1 text-xs text-ink-500">{s.label}</p>
                  <p className="text-sm font-semibold text-navy-800">
                    {s.total} of {s.max}
                  </p>
                </div>
              ))}
            </div>

            {selfHarmValue !== null && (
              <div
                className={`mt-4 rounded-lg px-4 py-3 ${
                  selfHarmValue > 0 ? 'border border-red-200 bg-red-50' : 'bg-ink-50'
                }`}
              >
                <p className="mb-1 text-xs text-ink-600">Self-harm question (PHQ-9 item 9)</p>
                <p className={`text-sm font-semibold ${selfHarmValue > 0 ? 'text-red-700' : 'text-navy-800'}`}>
                  {FREQUENCY_LABELS[selfHarmValue] ?? `Answer ${selfHarmValue}`}
                </p>
              </div>
            )}

            {checkIn.completedAt && (
              <p className="mt-4 text-xs text-ink-500">Check-in completed {formatDate(checkIn.completedAt)}</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold text-navy-800">Referral reason</h3>
            <p className="text-sm text-ink-600">{referral.reason || 'No reason recorded.'}</p>
            {referral.createdAt && (
              <p className="mt-3 text-xs text-ink-500">Received {formatDate(referral.createdAt)}</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-navy-800">
              <Flag className="h-4 w-4 text-amber-500" /> Risk flags
            </h3>
            {flags.length === 0 ? (
              <p className="text-sm text-ink-500">No risk flags were recorded.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm text-ink-600">
                {flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </Card>

          <Disclaimer>
            Mindora screening does not replace professional clinical assessment. Only necessary information is shared
            to protect user privacy.
          </Disclaimer>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            {accepted ? (
              <>
                <p className="text-sm font-semibold text-teal-700">You have accepted this referral.</p>
                <Button as="link" to="/pro/clients" variant="secondary" className="w-full">
                  Go to clients
                </Button>
              </>
            ) : (
              <Button
                variant="accent"
                className="w-full"
                onClick={handleAccept}
                disabled={accepting || closed}
              >
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept referral'}
              </Button>
            )}
            {closed && <p className="text-xs text-ink-500">This referral is closed.</p>}
            {actionError && (
              <p role="alert" className="text-sm text-red-600">
                {actionError}
              </p>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-navy-800">If a client is at immediate risk</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              Follow Mindora's safety escalation procedure and connect them to emergency support straight away:
              emergency services on <strong>999</strong> or <strong>112</strong>, or Kenya Red Cross on{' '}
              <strong>1199</strong>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}