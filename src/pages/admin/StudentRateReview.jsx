import { useEffect, useState } from 'react'
import { Loader2, GraduationCap, CreditCard, Download } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function VerificationRow({ v, onReviewed }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const act = async (status) => {
    setBusy(true)
    setError(null)
    try {
      await api.adminReviewStudentRateVerification(v.id, status, notes || undefined)
      onReviewed()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const downloadFile = async () => {
    try {
      const blob = await api.getStudentRateVerificationFileBlob(v.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold text-navy-800">{v.userFullName}</p>
          <p className="text-xs text-ink-400">{v.userEmail} · {formatDate(v.createdAt)}</p>
          {v.institutionName && <p className="text-xs text-teal-700 mt-0.5">Signed up with: {v.institutionName}</p>}
        </div>
        <Badge tone="navy">
          {v.method === 'STUDENT_EMAIL' ? (
            <><GraduationCap className="h-3.5 w-3.5" /> University email</>
          ) : (
            <><CreditCard className="h-3.5 w-3.5" /> ID document</>
          )}
        </Badge>
      </div>

      {v.method === 'STUDENT_EMAIL' ? (
        <p className="text-sm text-ink-600 mb-3 font-mono">{v.evidence}</p>
      ) : (
        <button
          onClick={downloadFile}
          className="flex items-center gap-1.5 text-sm text-teal-600 font-semibold mb-3"
        >
          <Download className="h-3.5 w-3.5" /> View uploaded document
        </button>
      )}

      <textarea
        placeholder="Review notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none mb-3"
      />

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="flex gap-2">
        <Button variant="accent" className="!text-sm !py-2" onClick={() => act('APPROVED')} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
        </Button>
        <Button variant="secondary" className="!text-sm !py-2" onClick={() => act('REJECTED')} disabled={busy}>
          Reject
        </Button>
      </div>
    </Card>
  )
}

export default function StudentRateReview() {
  const [verifications, setVerifications] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    api
      .adminListStudentRateVerifications()
      .then(setVerifications)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const pending = verifications?.filter((v) => v.status === 'PENDING') ?? []
  const reviewed = verifications?.filter((v) => v.status !== 'PENDING') ?? []

  return (
    <div>
      <PageHeader eyebrow="Student Rate" title="Student Rate verification" subtitle="Review school-email and ID submissions. Approving one also unlocks any programme cover that asks for proof." />

      <div className="p-4 md:p-8 max-w-2xl space-y-6">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {verifications === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {verifications && (
          <div>
            <h3 className="text-sm font-semibold text-navy-800 mb-2">Pending ({pending.length})</h3>
            {pending.length === 0 && <p className="text-sm text-ink-400">Nothing waiting for review.</p>}
            <div className="space-y-3">
              {pending.map((v) => (
                <VerificationRow key={v.id} v={v} onReviewed={load} />
              ))}
            </div>
          </div>
        )}

        {reviewed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-navy-800 mb-2">Reviewed</h3>
            <div className="space-y-2">
              {reviewed.map((v) => (
                <Card key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{v.userFullName}</p>
                    <p className="text-xs text-ink-400">{formatDate(v.createdAt)}</p>
                  </div>
                  <Badge tone={v.status === 'APPROVED' ? 'teal' : 'acute'}>{v.status}</Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
