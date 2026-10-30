import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Save } from 'lucide-react'
import Card from './Card.jsx'
import Button from './Button.jsx'
import { api } from '../data/api.js'

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white'
const LABEL = 'text-xs text-ink-500 block mb-1'

const SEX_OPTIONS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'INTERSEX', label: 'Intersex' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

const EMPTY = {
  phone: '',
  dateOfBirth: '',
  sex: '',
  county: '',
  nationalIdNumber: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  nextOfKinRelationship: '',
}

const REQUIRED = [
  'phone',
  'dateOfBirth',
  'sex',
  'county',
  'nextOfKinName',
  'nextOfKinPhone',
  'nextOfKinRelationship',
]

function toForm(data) {
  return {
    phone: data.phone ?? '',
    dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
    sex: data.sex ?? '',
    county: data.county ?? '',
    nationalIdNumber: data.nationalIdNumber ?? '',
    nextOfKinName: data.nextOfKinName ?? '',
    nextOfKinPhone: data.nextOfKinPhone ?? '',
    nextOfKinRelationship: data.nextOfKinRelationship ?? '',
  }
}

// The details a health record needs (phone, date of birth, sex, county, next
// of kin). Asked after payment or alongside a free triage, so it never gets
// in the way of getting help. onComplete runs once everything required is saved.
export default function RegistrationForm({ onComplete }) {
  const [saved, setSaved] = useState(undefined) // undefined = loading
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getRegistration()
      .then((data) => {
        if (cancelled) return
        setSaved(data)
        setForm(toForm(data))
        if (data.complete) onComplete?.()
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const missing = REQUIRED.some((key) => !String(form[key]).trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {}
      for (const [key, value] of Object.entries(form)) {
        const trimmed = String(value).trim()
        if (trimmed) payload[key] = trimmed
      }
      const result = await api.updateRegistration(payload)
      setSaved(result)
      setForm(toForm(result))
      if (result.complete) {
        setEditing(false)
        onComplete?.()
      } else {
        setError('Some required details are still missing.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (saved === undefined && !error) {
    return (
      <Card className="flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </Card>
    )
  }

  if (saved?.complete && !editing) {
    return (
      <Card className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-teal-700">
          <CheckCircle2 className="h-4 w-4" /> Your details are saved.
        </span>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-navy-800 underline">
          Edit
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-semibold text-navy-800 mb-1">Your details</h3>
      <p className="text-sm text-ink-600 mb-4">
        Your clinician needs these to look after you safely and keep a proper record. They are only seen by the
        clinician reviewing your care.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Phone number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="07XX XXX XXX" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Date of birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={set('dateOfBirth')}
              max={new Date().toISOString().slice(0, 10)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Sex</label>
            <select value={form.sex} onChange={set('sex')} className={INPUT}>
              <option value="">Choose...</option>
              {SEX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>County of residence</label>
            <input value={form.county} onChange={set('county')} placeholder="Nairobi" className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>
            National ID number <span className="text-ink-400">(optional)</span>
          </label>
          <input value={form.nationalIdNumber} onChange={set('nationalIdNumber')} className={INPUT} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 pt-2">Next of kin</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Name</label>
            <input value={form.nextOfKinName} onChange={set('nextOfKinName')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Phone</label>
            <input type="tel" value={form.nextOfKinPhone} onChange={set('nextOfKinPhone')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Relationship</label>
            <input
              value={form.nextOfKinRelationship}
              onChange={set('nextOfKinRelationship')}
              placeholder="Sibling"
              className={INPUT}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" variant="accent" disabled={missing || submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" /> Save details
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
