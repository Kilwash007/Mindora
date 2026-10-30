import { useEffect, useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { api } from '../../data/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Earnings() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getMyPayouts()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader eyebrow="Earnings" title="Your earnings" subtitle="Your share after Mindora's platform fee, and your payout history." />

      <div className="p-8 max-w-2xl space-y-4">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {data === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {data && (
          <Card className="bg-teal-50/60 border-teal-100">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-teal-700" />
              <p className="text-xs text-ink-500">Currently owed to you</p>
            </div>
            <p className="text-2xl font-bold text-navy-800">KES {data.owedKes.toLocaleString()}</p>
            <p className="text-xs text-ink-400 mt-1">
              From completed, paid sessions and triage reviews not yet settled. Mindora pays out by bank transfer or M-Pesa.
            </p>
          </Card>
        )}

        {data && data.payouts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-navy-800 mb-2">Payout history</h3>
            <div className="space-y-2">
              {data.payouts.map((p) => (
                <Card key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-navy-800">KES {p.amountKes.toLocaleString()}</p>
                    <Badge tone="teal">{p.method}</Badge>
                  </div>
                  <p className="text-xs text-ink-500">
                    {formatDate(p.paidAt)} · {p.appointments.length} session{p.appointments.length === 1 ? '' : 's'}
                    {p.triages?.length > 0 && ` · ${p.triages.length} triage review${p.triages.length === 1 ? '' : 's'}`}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {data && data.payouts.length === 0 && data.owedKes === 0 && (
          <Card className="text-center py-16 text-ink-500 text-sm">
            No earnings yet. They'll appear here once you complete a paid session.
          </Card>
        )}
      </div>
    </div>
  )
}
