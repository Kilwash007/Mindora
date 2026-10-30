import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { Disclaimer } from '../../components/Disclaimer.jsx'
import { api } from '../../data/api.js'

const INPUT =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none'

function PriceRow({ row, onSaved }) {
  const [price, setPrice] = useState(String(row.priceKes))
  const [studentPrice, setStudentPrice] = useState(row.studentPriceKes == null ? '' : String(row.studentPriceKes))
  const [payout, setPayout] = useState(String(row.payoutPercent))
  const [active, setActive] = useState(row.active)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const whole = (value) => /^\d+$/.test(value.trim())
  const valid =
    whole(price) && (studentPrice.trim() === '' || whole(studentPrice)) && whole(payout) && Number(payout) <= 100

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await api.adminUpdatePrice(row.service, {
        priceKes: Number(price),
        studentPriceKes: studentPrice.trim() === '' ? null : Number(studentPrice),
        payoutPercent: Number(payout),
        active,
      })
      onSaved({ ...row, ...updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-navy-800">{row.label}</p>
          {!active && <Badge tone="neutral">Not on sale</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-ink-500 block mb-1">Price (KES)</label>
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-xs text-ink-500 block mb-1">Student price (KES)</label>
            <input
              inputMode="numeric"
              value={studentPrice}
              onChange={(e) => setStudentPrice(e.target.value)}
              placeholder="Same as standard"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 block mb-1">Professional share (%)</label>
            <input inputMode="numeric" value={payout} onChange={(e) => setPayout(e.target.value)} className={INPUT} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            On sale
          </label>
          <Button type="submit" variant="accent" disabled={!valid || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              'Saved!'
            ) : (
              <>
                <Save className="h-4 w-4" /> Save
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </Card>
  )
}

export default function Prices() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .adminGetPrices()
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const replaceRow = (updated) =>
    setRows((current) => current.map((r) => (r.service === updated.service ? updated : r)))

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Price list"
        subtitle="The fixed prices patients pay, and the share paid to professionals."
      />
      <div className="p-8 max-w-2xl space-y-4">
        <Disclaimer>
          Changes apply to new triages and new bookings only. Existing ones keep the price they were made at. Every
          change is recorded in the audit log.
        </Disclaimer>

        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {rows === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </Card>
        )}

        {rows?.map((row) => (
          <PriceRow key={row.service} row={row} onSaved={replaceRow} />
        ))}
      </div>
    </div>
  )
}
