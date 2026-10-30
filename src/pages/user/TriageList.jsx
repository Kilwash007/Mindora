import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'
import {
  CARE_LEVEL_LABELS,
  TRIAGE_STATUS_LABELS,
  TRIAGE_STATUS_TONES,
  formatDateTime,
} from '../../data/services.js'

export default function TriageList() {
  const [triages, setTriages] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getMyTriages()
      .then((data) => !cancelled && setTriages(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="My triage"
        subtitle="Triage is the first step of care: a clinician reviews your screening and recommends the right support."
      />
      <div className="p-4 md:p-8 max-w-2xl space-y-4">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {triages === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {triages && triages.length === 0 && (
          <Card className="text-center py-12 space-y-4">
            <p className="text-sm text-ink-500">
              You have not started a triage yet. It begins with a free screening.
            </p>
            <Button as="link" to="/app/check-in" variant="accent">
              Start the free screening
            </Button>
          </Card>
        )}

        {triages?.map((t) => (
          <Link key={t.id} to={`/app/triage/${t.id}`} className="block">
            <Card className="hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-800">
                    {t.isFree ? 'Free urgent triage' : 'Triage'}
                    {t.careLevel ? ` · ${CARE_LEVEL_LABELS[t.careLevel]}` : ''}
                  </p>
                  <p className="text-xs text-ink-500 mt-1">{formatDateTime(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={TRIAGE_STATUS_TONES[t.status]}>{TRIAGE_STATUS_LABELS[t.status]}</Badge>
                  <ArrowRight className="h-4 w-4 text-ink-400" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
