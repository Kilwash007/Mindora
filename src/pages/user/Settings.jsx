import { useEffect, useState } from 'react'
import { Download, Loader2, AlertTriangle, Building2, Check } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { useAppState } from '../../data/AppState.jsx'
import { api } from '../../data/api.js'

function statusTone(status) {
  if (status === 'COMPLETED') return 'neutral'
  if (status === 'REJECTED') return 'acute'
  return 'elevated' // PENDING
}

const typeLabels = {
  EMPLOYER: 'Employer',
  UNIVERSITY: 'University',
  HEALTHCARE_PROVIDER: 'Healthcare provider',
  INSURER: 'Insurer',
  OTHER: 'Other',
}

function coverageSummary(inst) {
  if (inst.sponsoredSessionsPerMember == null) {
    return `${inst.coveragePercent}% of session fees covered`
  }
  const remaining = Math.max(0, inst.sponsoredSessionsPerMember - (inst.sponsoredSessionsUsed ?? 0))
  const sessionWord = inst.sponsoredSessionsPerMember === 1 ? 'session' : 'sessions'
  const label = inst.coveragePercent >= 100 ? 'free' : `${inst.coveragePercent}% covered`
  return `${inst.sponsoredSessionsUsed ?? 0} of ${inst.sponsoredSessionsPerMember} ${label} ${sessionWord} used · ${remaining} remaining`
}

export default function Settings() {
  const { authUser } = useAppState()
  const [deletionRequest, setDeletionRequest] = useState(undefined) // undefined = loading, null = none
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  const [myInstitution, setMyInstitution] = useState(undefined) // undefined = loading, null = not linked
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState(null)
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  const loadDeletionStatus = () => {
    api
      .getMyDeletionRequest()
      .then(setDeletionRequest)
      .catch((err) => setError(err.message))
  }

  const loadInstitution = () => {
    api
      .getMyInstitution()
      .then(setMyInstitution)
      .catch((err) => setError(err.message))
  }

  useEffect(loadDeletionStatus, [])
  useEffect(loadInstitution, [])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const data = await api.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mindora-my-data.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleRequestDeletion = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.requestAccountDeletion(reason)
      setReason('')
      loadDeletionStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    setEnrolling(true)
    setEnrollError(null)
    setEnrollSuccess(false)
    try {
      await api.enrollInInstitution(enrollmentCode)
      setEnrollmentCode('')
      setEnrollSuccess(true)
      loadInstitution()
    } catch (err) {
      setEnrollError(err.message)
    } finally {
      setEnrolling(false)
    }
  }

  const hasPendingRequest = deletionRequest?.status === 'PENDING'

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Account settings" />
      <div className="p-4 md:p-8 max-w-xl space-y-6">
        <Card>
          <p className="text-xs text-ink-500 mb-1">Full name</p>
          <p className="font-medium text-navy-800 mb-4">{authUser?.fullName}</p>
          <p className="text-xs text-ink-500 mb-1">Email</p>
          <p className="font-medium text-navy-800 mb-4">{authUser?.email}</p>
          <p className="text-xs text-ink-500 mb-1">Privacy</p>
          <p className="text-sm text-ink-600">
            Your mental-health information is confidential and only shared with professionals you
            choose to consult.
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Employer or university benefit</h3>

          {myInstitution === undefined && (
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
            </p>
          )}

          {myInstitution === null && (
            <>
              <p className="text-sm text-ink-600 mb-4">
                If your employer or university partners with Mindora, enter the code they shared
                with you to link your account. This may reduce or fully cover the cost of
                sessions — your employer or university never sees which sessions you book, only
                aggregate usage.
              </p>
              <form onSubmit={handleEnroll} className="flex flex-col sm:flex-row gap-2">
                <input
                  placeholder="Enrollment code"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value)}
                  required
                  className="flex-1 min-w-0 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none uppercase"
                />
                <Button type="submit" variant="accent" disabled={enrolling}>
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link'}
                </Button>
              </form>
              {enrollError && <p className="text-sm text-red-600 mt-2">{enrollError}</p>}
            </>
          )}

          {myInstitution && (
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-teal-600" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-navy-800">{myInstitution.name}</p>
                  {enrollSuccess && <Check className="h-4 w-4 text-teal-600" />}
                </div>
                <p className="text-xs text-ink-500">
                  {typeLabels[myInstitution.type] ?? myInstitution.type} • {coverageSummary(myInstitution)}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Your data</h3>
          <p className="text-sm text-ink-600 mb-4">
            Download a copy of everything Mindora holds about you — check-ins, referrals, and
            appointments — as a JSON file.
          </p>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export my data
          </Button>
        </Card>

        {error && <Card className="text-sm text-red-600">{error}</Card>}

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Delete my account</h3>

          {deletionRequest === undefined && (
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
            </p>
          )}

          {deletionRequest && (
            <div className="flex items-center gap-2 mb-4">
              <Badge tone={statusTone(deletionRequest.status)}>{deletionRequest.status}</Badge>
              <span className="text-xs text-ink-500">
                {deletionRequest.status === 'PENDING' && 'Awaiting review by the Mindora team.'}
                {deletionRequest.status === 'REJECTED' && 'Your request was reviewed and not completed.'}
                {deletionRequest.status === 'COMPLETED' && 'Your account has been deleted.'}
              </span>
            </div>
          )}

          {!hasPendingRequest && deletionRequest?.status !== 'COMPLETED' && (
            <>
              <p className="text-sm text-ink-600 mb-4">
                Submitting this sends a request to the Mindora team for review — your account
                isn't deleted immediately. This is deliberate: some records may need to be
                retained briefly for review before removal.
              </p>
              <form onSubmit={handleRequestDeletion} className="space-y-3">
                <textarea
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
                <Button type="submit" variant="ghost" className="text-red-600" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" /> Request account deletion
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}