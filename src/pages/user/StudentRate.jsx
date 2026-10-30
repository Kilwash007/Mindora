import { useEffect, useState } from 'react'
import { Loader2, GraduationCap, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

function statusBadge(status) {
  if (status === 'APPROVED') return <Badge tone="teal"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</Badge>
  if (status === 'REJECTED') return <Badge tone="acute"><XCircle className="h-3.5 w-3.5" /> Not approved</Badge>
  return <Badge tone="elevated"><Clock className="h-3.5 w-3.5" /> Under review</Badge>
}

export default function StudentRate() {
  const [status, setStatus] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const [method, setMethod] = useState('STUDENT_EMAIL')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api
      .getStudentRateStatus()
      .then(setStatus)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (method === 'STUDENT_EMAIL') {
        await api.submitStudentRateEmail(email)
      } else {
        if (!file) throw new Error('Please choose a file to upload.')
        await api.submitStudentRateId(file)
      }
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Student Rate"
        title="Student Rate"
        subtitle="A lower session price for verified students and young adults (18–25)."
      />

      <div className="p-4 md:p-8 max-w-xl space-y-4">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {status === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {status?.eligible && (
          <Card className="bg-teal-50/60 border-teal-100 text-center py-8">
            <CheckCircle2 className="h-8 w-8 text-teal-600 mx-auto mb-2" />
            <p className="font-semibold text-navy-800 mb-1">You're verified for the Student Rate</p>
            <p className="text-sm text-ink-600">
              The student price is applied automatically when you book, and you will see it on the
              booking screen before you confirm.
            </p>
          </Card>
        )}

        {status && !status.eligible && status.latest && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-navy-800">Your request</p>
              {statusBadge(status.latest.status)}
            </div>
            <p className="text-sm text-ink-600">
              {status.latest.method === 'STUDENT_EMAIL'
                ? 'Submitted via university email.'
                : 'Submitted via ID document.'}
            </p>
            {status.latest.reviewNotes && (
              <p className="text-sm text-ink-500 mt-2 italic">"{status.latest.reviewNotes}"</p>
            )}
            {status.latest.status === 'REJECTED' && (
              <p className="text-xs text-ink-400 mt-3">
                You can submit a new request below.
              </p>
            )}
          </Card>
        )}

        {status && !status.eligible && (!status.latest || status.latest.status === 'REJECTED') && (
          <Card>
            <h3 className="font-semibold text-navy-800 mb-4">Verify your eligibility</h3>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setMethod('STUDENT_EMAIL')}
                className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
                  method === 'STUDENT_EMAIL' ? 'border-teal-400 bg-teal-50 text-navy-800' : 'border-ink-200 text-ink-600'
                }`}
              >
                <GraduationCap className="h-5 w-5" /> University email
              </button>
              <button
                type="button"
                onClick={() => setMethod('YOUNG_ADULT_ID')}
                className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
                  method === 'YOUNG_ADULT_ID' ? 'border-teal-400 bg-teal-50 text-navy-800' : 'border-ink-200 text-ink-600'
                }`}
              >
                <CreditCard className="h-5 w-5" /> ID (age 18–25)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {method === 'STUDENT_EMAIL' ? (
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">
                    Your university email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.ac.ke"
                    required
                    className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-navy-700 mb-1 block">
                    Upload a photo or scan of your ID
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                    className="w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700"
                  />
                  <p className="text-xs text-ink-400 mt-1">PDF, JPG, or PNG. Reviewed by our team, not stored anywhere else.</p>
                </div>
              )}

              <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
              </Button>
            </form>
          </Card>
        )}

        {status && !status.eligible && status.latest?.status === 'PENDING' && (
          <p className="text-xs text-ink-400 text-center">
            Our team typically reviews requests within a couple of days.
          </p>
        )}
      </div>
    </div>
  )
}
