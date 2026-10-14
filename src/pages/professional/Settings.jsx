import { useEffect, useState } from 'react'
import { Upload, Loader2, FileText, Eye, Download, AlertTriangle, Save } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { api } from '../../data/api.js'
import { PROFESSIONAL_TYPE_OPTIONS } from '../../data/professionalTypes.js'

const docTypes = [
  { value: 'LICENSE', label: 'Professional license' },
  { value: 'GOVERNMENT_ID', label: 'Government-issued ID' },
  { value: 'DEGREE_CERTIFICATE', label: 'Degree certificate' },
  { value: 'OTHER', label: 'Other supporting document' },
]

const STUDENT_RATE_FEE_CAP_KES = 2000

function docStatusTone(status) {
  if (status === 'APPROVED') return 'teal'
  if (status === 'REJECTED') return 'acute'
  return 'elevated' // PENDING
}

function deletionStatusTone(status) {
  if (status === 'COMPLETED') return 'neutral'
  if (status === 'REJECTED') return 'acute'
  return 'elevated' // PENDING
}

const emptyProfileForm = {
  type: 'PSYCHOLOGIST',
  bio: '',
  qualifications: '',
  focusAreas: '',
  languages: '',
  yearsExperience: 0,
  location: '',
  feeKes: 0,
  studentRateFeeKes: '',
  supervisorName: '',
  onlineAvailable: true,
  inPersonAvailable: false,
}

export default function Settings() {
  const [profile, setProfile] = useState(undefined) // undefined = loading
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [documents, setDocuments] = useState(null)
  const [error, setError] = useState(null)
  const [selectedType, setSelectedType] = useState('LICENSE')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const [deletionRequest, setDeletionRequest] = useState(undefined)
  const [reason, setReason] = useState('')
  const [submittingDeletion, setSubmittingDeletion] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadProfile = () => {
    api
      .getMyProfile()
      .then((p) => {
        setProfile(p)
        setProfileForm({
          type: p.type ?? 'PSYCHOLOGIST',
          bio: p.bio ?? '',
          qualifications: (p.qualifications ?? []).join(', '),
          focusAreas: (p.focusAreas ?? []).join(', '),
          languages: (p.languages ?? []).join(', '),
          yearsExperience: p.yearsExperience ?? 0,
          location: p.location ?? '',
          feeKes: p.feeKes ?? 0,
          studentRateFeeKes: p.studentRateFeeKes != null ? String(p.studentRateFeeKes) : '',
          supervisorName: p.supervisorName ?? '',
          onlineAvailable: p.onlineAvailable ?? true,
          inPersonAvailable: p.inPersonAvailable ?? false,
        })
      })
      .catch((err) => setError(err.message))
  }

  const load = () => {
    api
      .getMyDocuments()
      .then(setDocuments)
      .catch((err) => setError(err.message))
  }

  const loadDeletionStatus = () => {
    api
      .getMyDeletionRequest()
      .then(setDeletionRequest)
      .catch((err) => setError(err.message))
  }

  useEffect(loadProfile, [])
  useEffect(load, [])
  useEffect(loadDeletionStatus, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSaved(false)
    setProfileError(null)

    const studentRateFeeKesValue =
      profileForm.studentRateFeeKes === '' ? null : Number(profileForm.studentRateFeeKes)

    if (studentRateFeeKesValue !== null && studentRateFeeKesValue > STUDENT_RATE_FEE_CAP_KES) {
      setProfileError(`Student Rate fee can't be more than KES ${STUDENT_RATE_FEE_CAP_KES.toLocaleString()}.`)
      setSavingProfile(false)
      return
    }

    try {
      const payload = {
        type: profileForm.type,
        bio: profileForm.bio,
        qualifications: profileForm.qualifications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        focusAreas: profileForm.focusAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        languages: profileForm.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsExperience: Number(profileForm.yearsExperience),
        location: profileForm.location,
        feeKes: Number(profileForm.feeKes),
        studentRateFeeKes: studentRateFeeKesValue,
        supervisorName: profileForm.supervisorName === '' ? null : profileForm.supervisorName,
        onlineAvailable: profileForm.onlineAvailable,
        inPersonAvailable: profileForm.inPersonAvailable,
      }
      await api.updateMyProfile(payload)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
      loadProfile()
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await api.uploadDocument(selectedType, file)
      setFile(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleView = async (id) => {
    setViewingId(id)
    try {
      const blob = await api.getDocumentFileBlob(id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

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
    setSubmittingDeletion(true)
    setError(null)
    try {
      await api.requestAccountDeletion(reason)
      setReason('')
      loadDeletionStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingDeletion(false)
    }
  }

  const hasPendingDeletion = deletionRequest?.status === 'PENDING'

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Profile & verification"
        subtitle="Keep your public profile up to date and manage your verification documents."
      />

      <div className="p-8 max-w-2xl space-y-6">
        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Your public profile</h3>

          {profile === undefined && !error && (
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </p>
          )}

          {profile && (
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs text-ink-500 block mb-1">Profession</label>
                <select
                  value={profileForm.type}
                  onChange={(e) => setProfileForm({ ...profileForm, type: e.target.value })}
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white"
                >
                  {PROFESSIONAL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-600 mt-1">
                  Changing this will remove your "Verified" badge until Mindora reviews it again.
                </p>
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">Qualifications (comma-separated)</label>
                <input
                  value={profileForm.qualifications}
                  onChange={(e) => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                  placeholder="PhD Clinical Psychology — University of Nairobi"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
                <p className="text-xs text-amber-600 mt-1">
                  Changing this will remove your "Verified" badge until Mindora reviews it again.
                </p>
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">Focus areas (comma-separated)</label>
                <input
                  value={profileForm.focusAreas}
                  onChange={(e) => setProfileForm({ ...profileForm, focusAreas: e.target.value })}
                  placeholder="Anxiety, Depression, Trauma"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">Languages (comma-separated)</label>
                <input
                  value={profileForm.languages}
                  onChange={(e) => setProfileForm({ ...profileForm, languages: e.target.value })}
                  placeholder="English, Swahili"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-500 block mb-1">Years of experience</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.yearsExperience}
                    onChange={(e) => setProfileForm({ ...profileForm, yearsExperience: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-500 block mb-1">Fee (KES per session)</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.feeKes}
                    onChange={(e) => setProfileForm({ ...profileForm, feeKes: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">
                  Student Rate fee <span className="text-ink-400">(optional, max KES {STUDENT_RATE_FEE_CAP_KES.toLocaleString()})</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={STUDENT_RATE_FEE_CAP_KES}
                  value={profileForm.studentRateFeeKes}
                  onChange={(e) => setProfileForm({ ...profileForm, studentRateFeeKes: e.target.value })}
                  placeholder="Leave blank to not offer this rate"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
                <p className="text-xs text-ink-400 mt-1">
                  A discounted rate for verified students and young adults (18–25). Mindora takes 25%
                  on these bookings instead of the usual 35%.
                </p>
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">
                  Supervisor name <span className="text-ink-400">(optional, for interns)</span>
                </label>
                <input
                  value={profileForm.supervisorName}
                  onChange={(e) => setProfileForm({ ...profileForm, supervisorName: e.target.value })}
                  placeholder="Dr. Jane Mwangi"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500 block mb-1">Location</label>
                <input
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="Nairobi, Kenya"
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    checked={profileForm.onlineAvailable}
                    onChange={(e) => setProfileForm({ ...profileForm, onlineAvailable: e.target.checked })}
                  />
                  Online sessions
                </label>
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    checked={profileForm.inPersonAvailable}
                    onChange={(e) => setProfileForm({ ...profileForm, inPersonAvailable: e.target.checked })}
                  />
                  In-person sessions
                </label>
              </div>

              {profileError && <p className="text-sm text-red-600">{profileError}</p>}

              <Button type="submit" variant="accent" disabled={savingProfile}>
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : profileSaved ? (
                  'Saved!'
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save profile
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>

        <Disclaimer>
          Files are limited to PDF, JPG, or PNG, up to 10 MB. Documents are reviewed by the
          Mindora platform team — approval can take a few business days.
        </Disclaimer>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Upload a document</h3>
          <div className="space-y-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            >
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy-700"
            />
            <Button variant="accent" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
          </div>
        </Card>

        {error && <Card className="text-sm text-red-600">{error}</Card>}

        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Your documents</h3>

          {documents === null && !error && (
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </p>
          )}

          {documents && documents.length === 0 && (
            <p className="text-sm text-ink-400">No documents uploaded yet.</p>
          )}

          <div className="space-y-3">
            {documents?.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-ink-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-navy-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-navy-800">
                      {docTypes.find((t) => t.value === d.type)?.label ?? d.type}
                    </p>
                    <p className="text-xs text-ink-400">{d.fileName}</p>
                    {d.status === 'REJECTED' && d.reviewNotes && (
                      <p className="text-xs text-red-600 mt-1">Reason: {d.reviewNotes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tone={docStatusTone(d.status)}>{d.status}</Badge>
                  <button
                    onClick={() => handleView(d.id)}
                    disabled={viewingId === d.id}
                    className="text-teal-600 hover:text-teal-700"
                    aria-label="View document"
                  >
                    {viewingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Your data</h3>
          <p className="text-sm text-ink-600 mb-4">
            Download a copy of everything Mindora holds about your professional account —
            profile, documents, and appointments — as a JSON file.
          </p>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export my data
          </Button>
        </Card>

        <Card>
          <h3 className="font-semibold text-navy-800 mb-2">Delete my account</h3>

          {deletionRequest === undefined && (
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
            </p>
          )}

          {deletionRequest && (
            <div className="flex items-center gap-2 mb-4">
              <Badge tone={deletionStatusTone(deletionRequest.status)}>{deletionRequest.status}</Badge>
              <span className="text-xs text-ink-500">
                {deletionRequest.status === 'PENDING' && 'Awaiting review by the Mindora team.'}
                {deletionRequest.status === 'REJECTED' && 'Your request was reviewed and not completed.'}
                {deletionRequest.status === 'COMPLETED' && 'Your account has been deleted.'}
              </span>
            </div>
          )}

          {!hasPendingDeletion && deletionRequest?.status !== 'COMPLETED' && (
            <>
              <p className="text-sm text-ink-600 mb-4">
                Submitting this sends a request to the Mindora team for review — your account
                isn't deleted immediately. Your own clinical notes on patients may be retained
                separately for record-keeping purposes.
              </p>
              <form onSubmit={handleRequestDeletion} className="space-y-3">
                <textarea
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                />
                <Button type="submit" variant="ghost" className="text-red-600" disabled={submittingDeletion}>
                  {submittingDeletion ? (
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