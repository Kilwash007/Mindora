import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import TriageChat from '../../components/TriageChat.jsx'
import { api } from '../../data/api.js'
import { SCREENING_QUESTIONS, FREQUENCY_OPTIONS, YES_NO_OPTIONS } from '../../data/screening.js'
import {
  CARE_LEVEL_LABELS,
  URGENCY_LABELS,
  RISK_TONES,
  formatDateTime,
} from '../../data/services.js'

const ICD10_PATTERN = /^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/
const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white'
const LABEL = 'text-xs text-ink-500 block mb-1'

const QUESTION_BY_ID = new Map(SCREENING_QUESTIONS.map((q) => [q.id, q]))
const DOMAIN_MAX = { PHQ9: 27, GAD7: 21, CAGEAID: 4 }
const DOMAIN_LABEL = { PHQ9: 'PHQ-9', GAD7: 'GAD-7', CAGEAID: 'CAGE-AID' }

function ageFrom(iso) {
  if (!iso) return null
  const dob = new Date(iso)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function answerLabel(question, value) {
  const options = question.scale === 'yesno' ? YES_NO_OPTIONS : FREQUENCY_OPTIONS
  return options.find((o) => o.value === value)?.label ?? String(value)
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-sm font-medium text-navy-800">{children || '—'}</p>
    </div>
  )
}

function CompleteForm({ triage, onDone }) {
  const [careLevel, setCareLevel] = useState('COUNSELLING')
  const [urgency, setUrgency] = useState(triage.isFree ? 'URGENT' : 'ROUTINE')
  const [icd10Code, setIcd10Code] = useState('')
  const [icd10Label, setIcd10Label] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const code = icd10Code.trim().toUpperCase()
  const codeOk = ICD10_PATTERN.test(code)
  const valid = codeOk && summary.trim().length >= 10

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.completeTriage(triage.id, {
        careLevel,
        urgency,
        icd10Code: code,
        icd10Label: icd10Label.trim() || undefined,
        summary: summary.trim(),
      })
      onDone()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <h3 className="font-semibold text-navy-800 mb-1">Complete the triage</h3>
      <p className="text-sm text-ink-600 mb-4">
        Record the level of care, how urgent it is, and the working ICD-10 code. This is shared with the patient only as
        the level of care and urgency.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Level of care</label>
            <select value={careLevel} onChange={(e) => setCareLevel(e.target.value)} className={INPUT}>
              {Object.entries(CARE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={INPUT}>
              {Object.entries(URGENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>ICD-10 code</label>
            <input
              value={icd10Code}
              onChange={(e) => setIcd10Code(e.target.value)}
              placeholder="e.g. F32.1"
              className={INPUT}
            />
            {icd10Code && !codeOk && <p className="text-xs text-red-600 mt-1">Use the format F32.1, F41.1 or Z63.0.</p>}
          </div>
          <div>
            <label className={LABEL}>
              Diagnosis label <span className="text-ink-400">(optional)</span>
            </label>
            <input
              value={icd10Label}
              onChange={(e) => setIcd10Label(e.target.value)}
              placeholder="Depressive episode, moderate"
              maxLength={200}
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Triage note (at least 10 characters)</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            maxLength={4000}
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
        </div>

        {careLevel === 'EMERGENCY_REFERRAL' && (
          <Disclaimer tone="urgent">
            Choosing emergency care raises an acute safety alert for the Mindora safety team. Make sure the patient has
            been told to call 999 or 112 and, where you can, that they are connected to care.
          </Disclaimer>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" variant="accent" disabled={!valid || submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete triage'}
        </Button>
      </form>
    </Card>
  )
}

export default function TriageDetail() {
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

  // Domain totals and the safety item, worked out from the stored answers.
  const summary = useMemo(() => {
    const totals = { PHQ9: 0, GAD7: 0, CAGEAID: 0 }
    let safety = null
    for (const a of triage?.screening?.answers ?? []) {
      if (a.domain in totals) totals[a.domain] += a.value
      if (QUESTION_BY_ID.get(a.questionId)?.isSafetyItem) safety = a.value
    }
    return { totals, safety }
  }, [triage])

  if (error && !triage) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Link to="/pro/triage" className="text-teal-600 font-semibold text-sm">
          Back to the queue
        </Link>
      </div>
    )
  }

  if (!triage) {
    return (
      <div className="p-4 md:p-8 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    )
  }

  const open = triage.status === 'QUEUED' || triage.status === 'IN_PROGRESS'
  const p = triage.patient
  const age = ageFrom(p.dateOfBirth)
  const answers = triage.screening.answers
    .map((a) => ({ ...a, question: QUESTION_BY_ID.get(a.questionId) }))
    .filter((a) => a.question)

  return (
    <div>
      <PageHeader
        eyebrow="Triage"
        title={p.fullName}
        subtitle={`Opened ${formatDateTime(triage.createdAt)}`}
        actions={
          <Link to="/pro/triage" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800">
            <ArrowLeft className="h-4 w-4" /> Queue
          </Link>
        }
      />

      <div className="p-4 md:p-8 max-w-3xl space-y-6">
        {(triage.isFree || summary.safety > 0) && (
          <Disclaimer tone="urgent">
            <strong>Urgent.</strong> This patient answered{' '}
            <strong>
              {summary.safety != null ? `"${answerLabel(QUESTION_BY_ID.get('phq9_9'), summary.safety)}"` : 'positively'}
            </strong>{' '}
            to thoughts of being better off dead or of hurting themselves (PHQ-9 item 9). Ask directly about safety first
            and give them the crisis numbers: 999 or 112, Kenya Red Cross 1199, Befrienders Kenya +254 722 178 177.
          </Disclaimer>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy-800">Patient</h3>
            <div className="flex gap-2">
              <Badge tone={RISK_TONES[triage.screening.riskLevel] ?? 'neutral'}>{triage.screening.riskLevel}</Badge>
              {triage.isFree && <Badge tone="acute">FREE URGENT</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Age">{age != null ? `${age}` : null}</Field>
            <Field label="Sex">{p.sex ? p.sex.replace(/_/g, ' ').toLowerCase() : null}</Field>
            <Field label="County">{p.county}</Field>
            <Field label="Phone">{p.phone}</Field>
            <Field label="Next of kin">{p.nextOfKinName}</Field>
            <Field label="Kin phone / relationship">
              {[p.nextOfKinPhone, p.nextOfKinRelationship].filter(Boolean).join(' · ')}
            </Field>
          </div>
          {!p.phone && (
            <p className="text-xs text-amber-700 mt-3">
              The patient has not added their details yet. You can ask them to complete the form on their triage page.
            </p>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Screening</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {Object.entries(summary.totals).map(([domain, total]) => (
              <div key={domain}>
                <p className="text-xs text-ink-500">{DOMAIN_LABEL[domain]}</p>
                <p className="text-lg font-bold text-navy-800">
                  {total}
                  <span className="text-xs font-normal text-ink-400"> / {DOMAIN_MAX[domain]}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400 mb-3">
            Completed {formatDateTime(triage.screening.completedAt)}. A screening, not a diagnosis.
          </p>
          <details>
            <summary className="text-sm font-semibold text-navy-800 cursor-pointer">All {answers.length} answers</summary>
            <ul className="mt-3 space-y-2">
              {answers.map((a) => (
                <li key={a.questionId} className="text-sm flex justify-between gap-4 border-b border-ink-100 pb-2">
                  <span className={a.question.isSafetyItem && a.value > 0 ? 'text-red-700 font-semibold' : 'text-ink-600'}>
                    {a.question.prompt}
                  </span>
                  <span className="shrink-0 font-medium text-navy-800">{answerLabel(a.question, a.value)}</span>
                </li>
              ))}
            </ul>
          </details>
        </Card>

        <TriageChat
          triageId={triage.id}
          role="professional"
          canSend={open}
          disabledReason="This triage is closed."
        />

        {open && <CompleteForm triage={triage} onDone={load} />}

        {triage.status === 'COMPLETED' && (
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-teal-700 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Triage completed {formatDateTime(triage.completedAt)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Level of care">{CARE_LEVEL_LABELS[triage.careLevel]}</Field>
              <Field label="Urgency">{URGENCY_LABELS[triage.urgency]}</Field>
              <Field label="ICD-10">{triage.icd10Code}</Field>
              <Field label="Label">{triage.icd10Label}</Field>
            </div>
            <div>
              <p className="text-xs text-ink-500">Triage note</p>
              <p className="text-sm text-ink-700 whitespace-pre-wrap">{triage.summary}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
