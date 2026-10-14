import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff, FileText, Eye, Check, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'
import { professionalTypeLabel } from '../../data/professionalTypes.js'

const docTypeLabels = {
  LICENSE: 'Professional license',
  GOVERNMENT_ID: 'Government-issued ID',
  DEGREE_CERTIFICATE: 'Degree certificate',
  OTHER: 'Other supporting document',
}

export default function Professionals() {
  const [professionals, setProfessionals] = useState(null)
  const [documents, setDocuments] = useState(null)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)

  const load = () => {
    api.adminListProfessionals().then(setProfessionals).catch((err) => setError(err.message))
    api.adminListDocuments().then(setDocuments).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleToggleVerified = async (professional) => {
    setUpdatingId(professional.id)
    try {
      await api.adminSetProfessionalVerified(professional.id, !professional.verified)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleReviewDocument = async (docId, status) => {
    setUpdatingId(docId)
    try {
      const reviewNotes =
        status === 'REJECTED' ? window.prompt('Reason for rejecting this document (shown to the professional):') ?? '' : undefined
      await api.adminReviewDocument(docId, status, reviewNotes)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleView = async (docId) => {
    setViewingId(docId)
    try {
      const blob = await api.getDocumentFileBlob(docId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message)
    } finally {
      setViewingId(null)
    }
  }

  const pendingDocs = documents?.filter((d) => d.status === 'PENDING') ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Professional network"
        title="Manage professionals"
        subtitle="Verified professionals are visible in the patient-facing directory and can receive referrals."
      />

      <div className="p-8 space-y-8 max-w-4xl">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        <div>
          <h3 className="font-semibold text-navy-800 mb-3">
            Pending KYC review {documents !== null && `(${pendingDocs.length})`}
          </h3>

          {documents === null && !error && (
            <Card className="flex items-center gap-2 text-ink-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading documents...
            </Card>
          )}

          {documents !== null && pendingDocs.length === 0 && (
            <Card className="text-sm text-ink-400 text-center py-8">No documents awaiting review.</Card>
          )}

          <div className="space-y-3">
            {pendingDocs.map((d) => (
              <Card key={d.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-navy-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{d.professionalFullName}</p>
                    <p className="text-xs text-ink-500">{d.professionalEmail}</p>
                    <p className="text-xs text-ink-400 mt-1">
                      {docTypeLabels[d.type] ?? d.type} • {d.fileName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleView(d.id)}
                    disabled={viewingId === d.id}
                    className="text-teal-600 hover:text-teal-700 p-2"
                    aria-label="View document"
                  >
                    {viewingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReviewDocument(d.id, 'APPROVED')}
                    disabled={updatingId === d.id}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => handleReviewDocument(d.id, 'REJECTED')}
                    disabled={updatingId === d.id}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-navy-800 mb-3">All professionals</h3>

          {professionals === null && !error && (
            <Card className="flex items-center gap-2 text-ink-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading professionals...
            </Card>
          )}

          <div className="space-y-3">
            {professionals?.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-navy-800">{p.fullName}</p>
                    <Badge tone={p.verified ? 'teal' : 'neutral'}>
                      {p.verified ? 'Verified' : 'Pending review'}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-500">{professionalTypeLabel(p.type)}</p>
                  <p className="text-xs text-ink-400 mt-1">{p.email}</p>
                </div>
                <Button
                  variant={p.verified ? 'secondary' : 'accent'}
                  onClick={() => handleToggleVerified(p)}
                  disabled={updatingId === p.id}
                >
                  {updatingId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : p.verified ? (
                    <>
                      <ShieldOff className="h-4 w-4" /> Unverify
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Verify
                    </>
                  )}
                </Button>
              </Card>
            ))}

            {professionals && professionals.length === 0 && (
              <Card className="text-center text-ink-400 py-12 text-sm">
                No professionals have registered yet.
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}