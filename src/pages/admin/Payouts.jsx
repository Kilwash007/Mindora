import { useEffect, useState } from 'react'
import { Loader2, Wallet, History } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function SettleForm({ entry, onSettled, onCancel }) {
  const [method, setMethod] = useState('Bank transfer')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.createPayout({
        professionalId: entry.professionalId,
        method,
        reference: reference || undefined,
        note: note || undefined,
      })
      onSettled()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-ink-100 space-y-2">
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
        >
          <option>Bank transfer</option>
          <option>M-Pesa</option>
          <option>Cash</option>
          <option>Other</option>
        </select>
        <input
          placeholder="Reference (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
        />
      </div>
      <input
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="accent" className="!text-xs !py-1.5" disabled={submitting}>
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : `Mark KES ${entry.owedKes.toLocaleString()} as paid`}
        </Button>
        <Button type="button" variant="secondary" className="!text-xs !py-1.5" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function LedgerTab() {
  const [ledger, setLedger] = useState(null)
  const [error, setError] = useState(null)
  const [settlingId, setSettlingId] = useState(null)

  const load = () => {
    api
      .getPayoutLedger()
      .then(setLedger)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  if (error) return <Card className="text-sm text-red-600">{error}</Card>
  if (!ledger) {
    return (
      <Card className="flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger...
      </Card>
    )
  }
  if (ledger.length === 0) {
    return <Card className="text-center py-16 text-ink-500 text-sm">Nothing currently owed to any professional.</Card>
  }

  return (
    <div className="space-y-3">
      {ledger.map((entry) => (
        <Card key={entry.professionalId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-navy-800">{entry.professionalName}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                {entry.appointmentCount} completed, paid session{entry.appointmentCount === 1 ? '' : 's'}
                {entry.triageCount > 0 && ` · ${entry.triageCount} triage review${entry.triageCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-navy-800">KES {entry.owedKes.toLocaleString()}</p>
              {settlingId !== entry.professionalId && (
                <button
                  onClick={() => setSettlingId(entry.professionalId)}
                  className="text-xs text-teal-600 font-semibold mt-1"
                >
                  Settle
                </button>
              )}
            </div>
          </div>
          {settlingId === entry.professionalId && (
            <SettleForm
              entry={entry}
              onSettled={() => {
                setSettlingId(null)
                load()
              }}
              onCancel={() => setSettlingId(null)}
            />
          )}
        </Card>
      ))}
    </div>
  )
}

function HistoryTab() {
  const [payouts, setPayouts] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .adminListPayouts()
      .then(setPayouts)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <Card className="text-sm text-red-600">{error}</Card>
  if (!payouts) {
    return (
      <Card className="flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
      </Card>
    )
  }
  if (payouts.length === 0) {
    return <Card className="text-center py-16 text-ink-500 text-sm">No payouts settled yet.</Card>
  }

  return (
    <div className="space-y-3">
      {payouts.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-navy-800">{p.professional.fullName}</p>
            <p className="font-bold text-navy-800">KES {p.amountKes.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Badge tone="navy">{p.method}</Badge>
            {p.reference && <span className="font-mono">{p.reference}</span>}
            <span>· {formatDate(p.paidAt)}</span>
            <span>· {p.appointments.length} session{p.appointments.length === 1 ? '' : 's'}</span>
            {p.triages?.length > 0 && (
              <span>· {p.triages.length} triage review{p.triages.length === 1 ? '' : 's'}</span>
            )}
          </div>
          {p.note && <p className="text-xs text-ink-400 mt-1 italic">{p.note}</p>}
        </Card>
      ))}
    </div>
  )
}

export default function Payouts() {
  const [tab, setTab] = useState('ledger')

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Professional payouts" subtitle="What's owed, and the settlement history." />
      <div className="p-8 max-w-2xl space-y-4">
        <div className="flex gap-1 rounded-xl border border-ink-200 p-1 bg-ink-50 w-fit">
          <button
            onClick={() => setTab('ledger')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'ledger' ? 'bg-white shadow-soft text-navy-800' : 'text-ink-500'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" /> Owed now
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'history' ? 'bg-white shadow-soft text-navy-800' : 'text-ink-500'
            }`}
          >
            <History className="h-3.5 w-3.5" /> History
          </button>
        </div>

        {tab === 'ledger' && <LedgerTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
