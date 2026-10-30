import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Loader2, ClipboardCheck } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { SCREENING_QUESTIONS, FREQUENCY_OPTIONS, YES_NO_OPTIONS } from '../../data/screening.js'
import { useAppState } from '../../data/AppState.jsx'

function CrisisNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 flex items-start gap-2 mb-6">
      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
      <p>
        If you're in danger right now, call <strong>999</strong> or <strong>112</strong>. Befrienders
        Kenya: <strong>+254 722 178 177</strong>. Kenya Red Cross: <strong>1199</strong> (toll-free,
        anytime). You can keep answering, or stop here and reach out now.
      </p>
    </div>
  )
}

function Intro({ onStart }) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div>
      <PageHeader eyebrow="Free screening" title="A free check on how you've been feeling" />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-navy-800">Before you start</h2>
          </div>
          <ul className="text-sm text-ink-600 space-y-2 list-disc list-inside mb-6">
            <li>
              It is <strong>free</strong>, and takes about 5 to 10 minutes. {SCREENING_QUESTIONS.length} short
              questions.
            </li>
            <li>It uses the PHQ-9, GAD-7 and CAGE-AID, widely used screening tools. It is not a diagnosis.</li>
            <li>
              Everyone completes it before booking triage or a session, even if they expect a low result. Your
              result stays valid for 30 days.
            </li>
            <li>
              If your answers suggest you may be in danger, we open a <strong>free urgent review</strong> with a
              clinician straight away.
            </li>
          </ul>

          <label className="flex items-start gap-3 text-sm text-ink-700 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree that Mindora may store my answers to guide my care, and that they may be seen by the
              clinician who reviews my triage.
            </span>
          </label>

          <Button variant="accent" onClick={onStart} disabled={!agreed}>
            Start the screening
          </Button>
        </Card>

        <p className="text-xs text-ink-500 text-center">
          If you're in danger right now, call <strong>999</strong> or <strong>112</strong>, or Kenya Red Cross on{' '}
          <strong>1199</strong> (toll-free, 24 hours).
        </p>
      </div>
    </div>
  )
}

export default function CheckIn() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [safetyTriggered, setSafetyTriggered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const navigate = useNavigate()
  const { submitCheckIn } = useAppState()

  if (!started) return <Intro onStart={() => setStarted(true)} />

  const question = SCREENING_QUESTIONS[step]
  const progress = ((step + 1) / SCREENING_QUESTIONS.length) * 100
  const selected = answers[question.id]
  const options = question.scale === 'yesno' ? YES_NO_OPTIONS : FREQUENCY_OPTIONS

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
    // Reflects the CURRENT answer to this specific question, not a
    // one-way switch — correcting yourself back to "Not at all" on this
    // same question clears the banner. Moving forward after a positive
    // answer keeps it visible, since that answer still stands.
    if (question.isSafetyItem) setSafetyTriggered(value > 0)
  }

  const handleContinue = async () => {
    if (step < SCREENING_QUESTIONS.length - 1) {
      setStep(step + 1)
      return
    }

    // Must wait for the real result before navigating — the result page
    // needs it to decide what to offer next.
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitCheckIn(answers)
      navigate('/app/check-in/result')
    } catch (err) {
      setSubmitError(err.message || 'Could not submit your screening. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Free screening" title="How have you been feeling lately?" />

      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2 text-sm text-ink-500">
          <span>
            Question {step + 1} of {SCREENING_QUESTIONS.length}
          </span>
          <span className="font-semibold text-navy-700">{question.instrument}</span>
        </div>
        <div className="h-2 rounded-full bg-ink-100 mb-8 overflow-hidden">
          <div
            className="h-full bg-teal-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {safetyTriggered && <CrisisNotice />}

        <Card className="mb-6">
          <p className="text-lg font-semibold text-navy-800 mb-6">
            {question.scale === 'yesno'
              ? 'Please answer honestly — this helps us understand how to support you.'
              : 'Over the last two weeks, how often has this applied to you?'}
          </p>
          <p className="text-navy-700 mb-6">{question.prompt}</p>

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  selected === opt.value
                    ? 'border-teal-400 bg-teal-50 text-navy-800'
                    : 'border-ink-200 hover:border-ink-300 text-ink-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {submitError && <p className="text-sm text-red-600 text-center mb-4">{submitError}</p>}

        <div className="flex justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
          >
            Back
          </Button>
          <Button variant="accent" onClick={handleContinue} disabled={selected === undefined || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === SCREENING_QUESTIONS.length - 1 ? (
              'See my results'
            ) : (
              'Continue'
            )}
          </Button>
        </div>

        <p className="text-xs text-ink-400 mt-8 text-center">
          This screening uses the PHQ-9, GAD-7, and CAGE-AID — widely used, validated screening
          tools. It is not a diagnosis.
        </p>
      </div>
    </div>
  )
}
