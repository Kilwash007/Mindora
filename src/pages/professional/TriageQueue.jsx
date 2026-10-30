import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Power } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { api } from '../../data/api.js'
import { RISK_TONES } from '../../data/services.js'

const QUEUE_POLL_MS = 10000

function waited(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ${mins % 60} min`
  return `${Math.floor(hours / 24)} d`
}

export default function TriageQueue() {
  const navigate = useNavigate()
  const [onCall, setOnCall] = useState(undefined) // { eligible, onCall }; undefined = loading
  const [queue, setQueue] = useState(null)
  const [error, setError] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [claimingId, setClaimingId] = useState(null)

  const loadQueue = useCallback(() => {
    api
      .getTriageQueue()
      .then((data) => {
        setQueue(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    api
      .getOnCall()
      .then(setOnCall)
      .catch((err) => {
        setOnCall(null)
        setError(err.message)
      })
  }, [])

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, QUEUE_POLL_MS)
    return () => clearInterval(interval)
  }, [loadQueue])

  const handleToggle = async () => {
    setToggling(true)
    setError(null)
    try {
      setOnCall(await api.setOnCall(!onCall.onCall))
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling(false)
    }
  }

  const handleClaim = async (id) => {
    setClaimingId(id)
    setError(null)
    try {
      await api.claimTriage(id)
      navigate(`/pro/triage/${id}`)
    } catch (err) {
      setError(err.message)
      setClaimingId(null)
      loadQueue()
    }
  }

  const notEligible = onCall && !onCall.eligible

  return (
    <div>
      <PageHeader
        eyebrow="Triage"
        title="Triage queue"
        subtitle="Patients waiting for a first review. Urgent cases come first."
      />

      <div className="p-4 md:p-8 max-w-2xl space-y-4">
        {onCall === undefined && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {notEligible && (
          <Disclaimer>
            Triage is available to verified psychiatric clinical officers, psychiatric nurses, psychologists and
            psychiatrists. Your account is not set up for it.
          </Disclaimer>
        )}

        {onCall?.eligible && (
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-navy-800 flex items-center gap-2">
                <Power className={`h-4 w-4 ${onCall.onCall ? 'text-teal-600' : 'text-ink-400'}`} />
                {onCall.onCall ? 'You are on call for triage' : 'You are off call'}
              </p>
              <p className="text-xs text-ink-500 mt-1">
                New triages are shared in turn between clinicians who are on call. Switch off when you cannot reply
                within the 2-hour window (8am to 8pm).
              </p>
            </div>
            <Button variant={onCall.onCall ? 'secondary' : 'accent'} onClick={handleToggle} disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : onCall.onCall ? 'Go off call' : 'Go on call'}
            </Button>
          </Card>
        )}

        {error && !notEligible && <Card className="text-sm text-red-600">{error}</Card>}

        {!notEligible && queue === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the queue...
          </Card>
        )}

        {!notEligible && queue && queue.length === 0 && (
          <Card className="text-center py-12 text-ink-500 text-sm">No triages are waiting right now.</Card>
        )}

        {!notEligible &&
          queue?.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-800">{t.patientName}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Waiting {waited(t.createdAt)} · {t.status === 'IN_PROGRESS' ? 'In progress' : 'New'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {t.isFree && <Badge tone="acute">URGENT · FREE</Badge>}
                  <Badge tone={RISK_TONES[t.riskLevel] ?? 'neutral'}>{t.riskLevel}</Badge>
                  {t.unreadMessages > 0 && <Badge tone="teal">{t.unreadMessages} new</Badge>}
                </div>
              </div>
              <div className="mt-3">
                {t.assignedToMe ? (
                  <Button as="link" to={`/pro/triage/${t.id}`} variant="accent">
                    Open
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => handleClaim(t.id)} disabled={claimingId === t.id}>
                    {claimingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Take this triage'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  )
}
