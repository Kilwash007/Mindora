import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

// Creates (or finds) the triage for a screening, then opens it. Asking twice
// is safe: the server returns the triage that already exists.
export default function TriageStart() {
  const { checkInId } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    api
      .createTriage(checkInId)
      .then((triage) => navigate(`/app/triage/${triage.id}`, { replace: true }))
      .catch((err) => setError(err))
  }, [checkInId, navigate])

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Triage" title="We couldn't start your triage" />
        <div className="p-4 md:p-8 max-w-xl mx-auto">
          <Card className="space-y-4">
            <p className="text-sm text-red-600">{error.message}</p>
            {error.code === 'SCREENING_EXPIRED' ? (
              <Button as="link" to="/app/check-in" variant="accent">
                Take a new free screening
              </Button>
            ) : (
              <Link to="/app/triage" className="text-sm font-semibold text-navy-800 underline">
                Back to my triage
              </Link>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 flex items-center gap-2 text-ink-500 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Starting your triage...
    </div>
  )
}
