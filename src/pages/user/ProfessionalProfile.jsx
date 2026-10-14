import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Languages, Briefcase, MapPin, Loader2, Star } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'
import { useAppState } from '../../data/AppState.jsx'
import { professionalTypeLabel } from '../../data/professionalTypes.js'

function modeLabel(p) {
  if (p.onlineAvailable && p.inPersonAvailable) return 'Online / In-person'
  if (p.onlineAvailable) return 'Online'
  if (p.inPersonAvailable) return 'In-person'
  return 'Not specified'
}

function Stars({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}`}
        />
      ))}
    </div>
  )
}

export default function ProfessionalProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setSelectedProfessional } = useAppState()
  const [professional, setProfessional] = useState(null)
  const [error, setError] = useState(null)
  const [reviewData, setReviewData] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getProfessional(id)
      .then((data) => !cancelled && setProfessional(data))
      .catch((err) => !cancelled && setError(err.message))
    api
      .getProfessionalReviews(id)
      .then((data) => !cancelled && setReviewData(data))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Link to="/app/find-a-professional" className="text-teal-600 font-semibold text-sm">
          Back to directory
        </Link>
      </div>
    )
  }

  if (!professional) {
    return (
      <div className="p-4 md:p-8 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading professional...
      </div>
    )
  }

  const handleBook = () => {
    setSelectedProfessional(professional)
    navigate('/app/book')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Professional profile"
        title={professional.fullName}
        subtitle={professionalTypeLabel(professional.type)}
      />

      <div className="p-4 md:p-8 grid lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {professional.verified && (
                <Badge tone="teal">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified professional
                </Badge>
              )}
              {reviewData && reviewData.count > 0 && (
                <div className="flex items-center gap-2">
                  <Stars value={reviewData.average} />
                  <span className="text-sm text-ink-600">
                    {reviewData.average.toFixed(1)} ({reviewData.count} review{reviewData.count === 1 ? '' : 's'})
                  </span>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-navy-800 mb-2">Biography</h3>
            <p className="text-sm text-ink-600 mb-6 leading-relaxed">
              {professional.bio || 'No biography provided yet.'}
            </p>

            {professional.qualifications?.length > 0 && (
              <>
                <h3 className="font-semibold text-navy-800 mb-2">Qualifications</h3>
                <ul className="text-sm text-ink-600 space-y-1 mb-6 list-disc list-inside">
                  {professional.qualifications.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </>
            )}

            {professional.focusAreas?.length > 0 && (
              <>
                <h3 className="font-semibold text-navy-800 mb-2">Areas of focus</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.focusAreas.map((f) => (
                    <Badge key={f} tone="navy">{f}</Badge>
                  ))}
                </div>
              </>
            )}
          </Card>

          {reviewData && reviewData.reviews.length > 0 && (
            <Card>
              <h3 className="font-semibold text-navy-800 mb-4">Patient reviews</h3>
              <p className="text-xs text-ink-400 mb-4">
                Reviews are shown anonymously to protect patient privacy.
              </p>
              <div className="space-y-4">
                {reviewData.reviews.map((r) => (
                  <div key={r.id} className="border-b border-ink-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <Stars value={r.rating} />
                      <span className="text-xs text-ink-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-ink-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex items-center gap-2 text-ink-600">
                <Briefcase className="h-4 w-4 text-navy-500" /> {professional.yearsExperience} years experience
              </div>
              {professional.location && (
                <div className="flex items-center gap-2 text-ink-600">
                  <MapPin className="h-4 w-4 text-navy-500" /> {professional.location}
                </div>
              )}
              {professional.languages?.length > 0 && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Languages className="h-4 w-4 text-navy-500" /> {professional.languages.join(', ')}
                </div>
              )}
            </div>
            <div className="border-t border-ink-100 pt-4 mb-4">
              <p className="text-xs text-ink-500 mb-1">Consultation fee</p>
              <p className="text-2xl font-bold text-navy-800">
                {professional.feeKes ? `KES ${professional.feeKes.toLocaleString()}` : 'Not listed'}
              </p>
              <p className="text-xs text-ink-400">{modeLabel(professional)}</p>
            </div>
            <Button variant="accent" className="w-full" onClick={handleBook}>
              Book consultation
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}