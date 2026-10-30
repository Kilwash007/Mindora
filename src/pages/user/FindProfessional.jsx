import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ArrowRight, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import { api } from '../../data/api.js'
import { PROFESSIONAL_TYPE_OPTIONS, PROFESSIONAL_TYPE_LABELS, professionalTypeLabel } from '../../data/professionalTypes.js'
import { servicesFor, formatKes, usePrices } from '../../data/services.js'

const specialties = ['Any', ...PROFESSIONAL_TYPE_OPTIONS.map((o) => o.value)]
const specialtyLabels = { Any: 'Any', ...PROFESSIONAL_TYPE_LABELS }
const modes = ['Any', 'Online', 'In-person']

function modeLabel(p) {
  if (p.onlineAvailable && p.inPersonAvailable) return 'Online / In-person'
  if (p.onlineAvailable) return 'Online'
  if (p.inPersonAvailable) return 'In-person'
  return 'Not specified'
}

export default function FindProfessional() {
  const [professionals, setProfessionals] = useState(null)
  const [error, setError] = useState(null)
  const [specialty, setSpecialty] = useState('Any')
  const [concern, setConcern] = useState('Any')
  const [mode, setMode] = useState('Any')
  const { priceOf } = usePrices()

  useEffect(() => {
    let cancelled = false
    api
      .listProfessionals()
      .then((data) => !cancelled && setProfessionals(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const concerns = useMemo(() => {
    if (!professionals) return ['Any']
    const all = new Set()
    professionals.forEach((p) => p.focusAreas.forEach((f) => all.add(f)))
    return ['Any', ...Array.from(all).sort()]
  }, [professionals])

  const filtered = useMemo(() => {
    if (!professionals) return []
    return professionals.filter((p) => {
      if (specialty !== 'Any' && p.type !== specialty) return false
      if (concern !== 'Any' && !p.focusAreas.includes(concern)) return false
      if (mode === 'Online' && !p.onlineAvailable) return false
      if (mode === 'In-person' && !p.inPersonAvailable) return false
      return true
    })
  }, [professionals, specialty, concern, mode])

  return (
    <div>
      <PageHeader eyebrow="Support network" title="Find the right professional" />

      <div className="p-4 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <FilterGroup
            label="Specialty"
            options={specialties}
            labels={specialtyLabels}
            value={specialty}
            onChange={setSpecialty}
          />
          <FilterGroup label="Concern" options={concerns} value={concern} onChange={setConcern} />
          <FilterGroup label="Consultation mode" options={modes} value={mode} onChange={setMode} />
        </aside>

        <div className="flex-1 space-y-4 min-w-0">
          {error && (
            <Card className="text-sm text-red-600">Couldn't load professionals: {error}</Card>
          )}

          {professionals === null && !error && (
            <Card className="flex items-center gap-2 text-ink-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading professionals...
            </Card>
          )}

          <Card className="text-sm text-ink-600">
            Sessions are booked after a free screening and a triage. Your triage decides the kind of care you need, and
            the price of each session is fixed by service, as shown below.
          </Card>

          {professionals !== null && (
            <p className="text-sm text-ink-500">{filtered.length} professionals found</p>
          )}

          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-xl bg-navy-800 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {p.fullName.split(' ').map((n) => n[0]).slice(-2).join('')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-navy-800">{p.fullName}</p>
                    {p.verified && <Badge tone="teal">Verified</Badge>}
                  </div>
                  <p className="text-sm text-ink-500 mb-1">{professionalTypeLabel(p.type)}</p>
                  <p className="text-xs text-ink-400 mb-2">{p.focusAreas.join(' • ')}</p>
                  <div className="flex items-center gap-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {p.location ?? 'Location not specified'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="md:text-right shrink-0 pl-18 md:pl-0">
                <div className="mb-1 space-y-0.5">
                  {servicesFor(p.type, priceOf).map((s) => (
                    <p key={s.service} className="text-sm font-semibold text-navy-800">
                      {s.label}
                      {s.priceKes != null ? ` · ${formatKes(s.priceKes)}` : ''}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-ink-400 mb-3">{modeLabel(p)}</p>
                <Link
                  to={`/app/find-a-professional/${p.id}`}
                  className="inline-flex items-center gap-1 text-teal-600 text-sm font-semibold"
                >
                  View profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}

          {professionals !== null && filtered.length === 0 && !error && (
            <Card className="text-center text-ink-400 py-12">
              No professionals match these filters yet — try widening your search.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ label, options, labels, value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1 md:block md:space-y-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors md:w-full ${
              value === opt ? 'bg-navy-800 text-white font-semibold' : 'text-ink-600 hover:bg-ink-100 bg-ink-50 md:bg-transparent'
            }`}
          >
            {labels ? labels[opt] ?? opt : opt}
          </button>
        ))}
      </div>
    </div>
  )
}
