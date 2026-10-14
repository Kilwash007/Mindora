import { useEffect, useState } from 'react'
import { Loader2, Building2, Plus, Copy, Check, BarChart3 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Badge from '../../components/Badge.jsx'
import Button from '../../components/Button.jsx'
import { api } from '../../data/api.js'

const typeLabels = {
  EMPLOYER: 'Employer',
  UNIVERSITY: 'University',
  HEALTHCARE_PROVIDER: 'Healthcare provider',
  INSURER: 'Insurer',
  OTHER: 'Other',
}

function statusTone(status) {
  if (status === 'ACTIVE') return 'teal'
  if (status === 'INACTIVE') return 'neutral'
  return 'elevated' // PENDING
}

// Blank means "no limit" and is sent to the backend as null.
function toLimit(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : null
}

const emptyForm = {
  name: '',
  type: 'EMPLOYER',
  contactName: '',
  contactEmail: '',
  notes: '',
  coveragePercent: 0,
  memberLimit: '',
  sponsoredSessionsPerMember: '',
}

export default function Institutions() {
  const [institutions, setInstitutions] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [statsById, setStatsById] = useState({})
  const [loadingStatsId, setLoadingStatsId] = useState(null)

  const load = () => {
    api.adminListInstitutions().then(setInstitutions).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        memberLimit: toLimit(form.memberLimit),
        sponsoredSessionsPerMember: toLimit(form.sponsoredSessionsPerMember),
      }
      if (!payload.contactEmail) delete payload.contactEmail
      if (!payload.contactName) delete payload.contactName
      if (!payload.notes) delete payload.notes
      await api.adminCreateInstitution(payload)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id, data) => {
    setUpdatingId(id)
    setError(null)
    try {
      await api.adminUpdateInstitution(id, data)
      setStatsById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleLoadStats = async (id) => {
    setLoadingStatsId(id)
    try {
      const stats = await api.adminGetInstitutionStats(id)
      setStatsById((prev) => ({ ...prev, [id]: stats }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingStatsId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institutions"
        title="Institutional partners"
        subtitle="Coverage percent determines how much of a professional's fee this institution pays for its linked members. Optional limits cap how many people can join and how many sessions each person gets covered. Stats are always aggregate — Mindora never shows which specific patients used the benefit."
      />

      <div className="p-8 space-y-6 max-w-4xl">
        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Add institution</h3>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-3">
            <input
              placeholder="Institution name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none md:col-span-2"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div>
              <label className="text-xs text-ink-500 block mb-1">
                Coverage % (0 = no coverage, 100 = fully sponsored)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.coveragePercent}
                onChange={(e) => setForm({ ...form, coveragePercent: Number(e.target.value) })}
                className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">Member limit (blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={form.memberLimit}
                onChange={(e) => setForm({ ...form, memberLimit: e.target.value })}
                placeholder="e.g. 50"
                className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">
                Covered sessions per member (blank = unlimited)
              </label>
              <input
                type="number"
                min={1}
                value={form.sponsoredSessionsPerMember}
                onChange={(e) => setForm({ ...form, sponsoredSessionsPerMember: e.target.value })}
                placeholder="e.g. 2"
                className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <input
              placeholder="Contact name (optional)"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
            <input
              placeholder="Contact email (optional)"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none md:col-span-2"
            />
            <Button type="submit" variant="accent" disabled={submitting} className="md:col-span-2 self-start">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add institution
            </Button>
          </form>
        </Card>

        {error && <Card className="text-sm text-red-600">{error}</Card>}

        {institutions === null && !error && (
          <Card className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading institutions...
          </Card>
        )}

        <div className="space-y-3">
          {institutions?.map((inst) => (
            <Card key={inst.id}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-navy-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-navy-800">{inst.name}</p>
                      <Badge tone={statusTone(inst.status)}>{inst.status}</Badge>
                    </div>
                    <p className="text-sm text-ink-500">{typeLabels[inst.type] ?? inst.type}</p>
                    {(inst.contactName || inst.contactEmail) && (
                      <p className="text-xs text-ink-400 mt-1">
                        {[inst.contactName, inst.contactEmail].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inst.status !== 'ACTIVE' && (
                    <Button
                      variant="secondary"
                      onClick={() => handleUpdate(inst.id, { status: 'ACTIVE' })}
                      disabled={updatingId === inst.id}
                    >
                      Activate
                    </Button>
                  )}
                  {inst.status !== 'INACTIVE' && (
                    <Button
                      variant="ghost"
                      className="text-ink-500"
                      onClick={() => handleUpdate(inst.id, { status: 'INACTIVE' })}
                      disabled={updatingId === inst.id}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-ink-100">
                <div>
                  <label className="text-xs text-ink-500 block mb-1">Coverage %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={inst.coveragePercent}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (val !== inst.coveragePercent) handleUpdate(inst.id, { coveragePercent: val })
                      }}
                      className="w-24 rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                    />
                    <span className="text-xs text-ink-400">% of fee covered per booking</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-ink-500 block mb-1">Enrollment code</label>
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm font-mono text-navy-800">
                      {inst.enrollmentCode}
                    </code>
                    <button
                      onClick={() => handleCopyCode(inst.id, inst.enrollmentCode)}
                      className="text-teal-600 hover:text-teal-700"
                      aria-label="Copy enrollment code"
                    >
                      {copiedId === inst.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-ink-500 block mb-1">Member limit</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={inst.memberLimit ?? ''}
                      placeholder="Unlimited"
                      onBlur={(e) => {
                        const val = toLimit(e.target.value)
                        if (val !== (inst.memberLimit ?? null)) handleUpdate(inst.id, { memberLimit: val })
                      }}
                      className="w-24 rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                    />
                    <span className="text-xs text-ink-400">people who can join</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-ink-500 block mb-1">Covered sessions per member</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={inst.sponsoredSessionsPerMember ?? ''}
                      placeholder="Unlimited"
                      onBlur={(e) => {
                        const val = toLimit(e.target.value)
                        if (val !== (inst.sponsoredSessionsPerMember ?? null)) {
                          handleUpdate(inst.id, { sponsoredSessionsPerMember: val })
                        }
                      }}
                      className="w-24 rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
                    />
                    <span className="text-xs text-ink-400">sessions each</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-ink-100">
                {!statsById[inst.id] ? (
                  <Button variant="ghost" onClick={() => handleLoadStats(inst.id)} disabled={loadingStatsId === inst.id}>
                    {loadingStatsId === inst.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    View usage stats
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-xs text-ink-500">Linked members</p>
                      <p className="font-semibold text-navy-800">
                        {statsById[inst.id].memberCount}
                        {statsById[inst.id].memberLimit != null && ` / ${statsById[inst.id].memberLimit}`}
                      </p>
                    </div>
                    {statsById[inst.id].placesRemaining != null && (
                      <div>
                        <p className="text-xs text-ink-500">Places remaining</p>
                        <p className="font-semibold text-navy-800">{statsById[inst.id].placesRemaining}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-ink-500">Sponsored appointments</p>
                      <p className="font-semibold text-navy-800">{statsById[inst.id].sponsoredAppointmentCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500">Total covered</p>
                      <p className="font-semibold text-navy-800">
                        KES {statsById[inst.id].totalCoveredKes.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {institutions && institutions.length === 0 && (
            <Card className="text-center text-ink-400 py-12 text-sm">
              No institutional partners yet.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}