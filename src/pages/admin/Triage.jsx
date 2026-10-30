import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { api } from '../../data/api.js'
import { formatKes, formatDateTime } from '../../data/services.js'
import { professionalTypeLabel } from '../../data/professionalTypes.js'

const REFRESH_MS = 30000

function waitedText(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${minutes % 60} min`
  return `${Math.floor(hours / 24)} d ${hours % 24} h`
}

function Count({ label, value, tone }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-2xl font-extrabold ${tone === 'warn' && value > 0 ? 'text-red-600' : 'text-navy-800'}`}>{value}</p>
    </Card>
  )
}

export default function AdminTriage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    api
      .adminGetTriageOverview()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="Triage"
        subtitle="Who is on call, what is waiting for a first reply, and anything that needs sorting out. No patient names are shown here."
      />

      <div className="p-8 max-w-4xl space-y-6">
        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {!data && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {data && (
          <>
            {data.onCall.count === 0 && (
              <Disclaimer tone="urgent">
                <strong>Nobody is on call for triage.</strong> New triages will be unassigned and every eligible clinician
                will be emailed. Ask a clinician to switch on call in their portal.
              </Disclaimer>
            )}
            {data.counts.escalated > 0 && (
              <Disclaimer>
                <strong>{data.counts.escalated} triage{data.counts.escalated === 1 ? ' has' : 's have'} gone overdue</strong>{' '}
                and been released to all clinicians. Check that someone takes {data.counts.escalated === 1 ? 'it' : 'them'}.
              </Disclaimer>
            )}
            {data.latePaid.length > 0 && (
              <Disclaimer>
                <strong>{data.latePaid.length} payment{data.latePaid.length === 1 ? '' : 's'} arrived after the slot was released.</strong>{' '}
                The money was taken but there is no session. Refund it or rebook the patient (listed below).
              </Disclaimer>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Count label="Waiting for a first reply" value={data.counts.queued} />
              <Count label="Not assigned to anyone" value={data.counts.unassigned} tone="warn" />
              <Count label="Overdue and released" value={data.counts.escalated} tone="warn" />
              <Count label="In progress" value={data.counts.inProgress} />
              <Count label="Awaiting payment" value={data.counts.awaitingPayment} />
              <Count label="Completed in 7 days" value={data.counts.completedLastWeek} />
            </div>

            <Card>
              <h3 className="font-semibold text-navy-800 mb-3">On call now ({data.onCall.count})</h3>
              {data.onCall.count === 0 ? (
                <p className="text-sm text-ink-500">Nobody.</p>
              ) : (
                <ul className="space-y-1">
                  {data.onCall.clinicians.map((c) => (
                    <li key={c.id} className="text-sm text-ink-700">
                      {c.fullName} <span className="text-ink-400">· {professionalTypeLabel(c.type)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padded={false} className="overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100">
                <h3 className="font-semibold text-navy-800">Waiting for a first reply</h3>
                <p className="text-xs text-ink-500">Oldest first. The clock counts from when it was paid or opened.</p>
              </div>
              {data.waiting.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-500 text-center">Nothing is waiting.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                      <th className="px-5 py-2 font-medium">Waiting</th>
                      <th className="px-3 py-2 font-medium">With</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.waiting.map((t) => (
                      <tr key={t.id} className="border-b border-ink-50 last:border-0">
                        <td className="px-5 py-3 font-semibold text-navy-800">{waitedText(t.waitingMinutes)}</td>
                        <td className="px-3 py-3 text-ink-700">{t.assignedTo ?? <span className="text-red-600">Nobody</span>}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {t.urgent && <Badge tone="acute">Urgent</Badge>}
                            {t.covered && <Badge tone="teal">Covered</Badge>}
                            {t.reminded && !t.released && <Badge tone="elevated">Reminded</Badge>}
                            {t.released && <Badge tone="high">Released</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card padded={false} className="overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100">
                <h3 className="font-semibold text-navy-800">Paid after the slot was released</h3>
                <p className="text-xs text-ink-500">Last 30 days. Use the receipt to refund, or the patient id to find them under Users.</p>
              </div>
              {data.latePaid.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-500 text-center">None.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                      <th className="px-5 py-2 font-medium">Receipt</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Session</th>
                      <th className="px-3 py-2 font-medium">Patient id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latePaid.map((p) => (
                      <tr key={p.paymentId} className="border-b border-ink-50 last:border-0 align-top">
                        <td className="px-5 py-3 font-mono text-xs text-ink-700">{p.mpesaReceiptNumber ?? '—'}</td>
                        <td className="px-3 py-3 font-semibold text-navy-800">{formatKes(p.amountKes)}</td>
                        <td className="px-3 py-3 text-ink-700">
                          {formatDateTime(p.scheduledFor)}
                          <p className="text-xs text-ink-400">{p.professionalName}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-ink-500 break-all">{p.userId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <p className="text-xs text-ink-400">Updated {formatDateTime(data.generatedAt)}. Refreshes every 30 seconds.</p>
          </>
        )}
      </div>
    </div>
  )
}
