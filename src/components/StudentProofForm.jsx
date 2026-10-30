import { useState } from 'react'
import { GraduationCap, CreditCard, Loader2 } from 'lucide-react'
import Button from './Button.jsx'
import { api } from '../data/api.js'

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none bg-white'

// Sends proof that someone is a student for review. Two ways: a school email
// address, or a photo or scan of a student ID or other ID. Our team looks at
// it; nothing is approved automatically. onSubmitted runs once it is sent.
export default function StudentProofForm({ onSubmitted }) {
  const [method, setMethod] = useState('YOUNG_ADULT_ID')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (method === 'STUDENT_EMAIL') {
        await api.submitStudentRateEmail(email.trim())
      } else {
        if (!file) throw new Error('Please choose a photo or scan to upload.')
        await api.submitStudentRateId(file)
      }
      onSubmitted?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const choice = (id) =>
    `flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
      method === id ? 'border-teal-400 bg-teal-50 text-navy-800' : 'border-ink-200 text-ink-600'
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMethod('YOUNG_ADULT_ID')} className={choice('YOUNG_ADULT_ID')}>
          <CreditCard className="h-5 w-5" /> Student ID or other ID
        </button>
        <button type="button" onClick={() => setMethod('STUDENT_EMAIL')} className={choice('STUDENT_EMAIL')}>
          <GraduationCap className="h-5 w-5" /> School email
        </button>
      </div>

      {method === 'STUDENT_EMAIL' ? (
        <div key="email">
          <label htmlFor="proof-email" className="text-xs font-medium text-navy-700 mb-1 block">
            Your school or university email address
          </label>
          <input
            id="proof-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ac.ke"
            required
            className={INPUT}
          />
        </div>
      ) : (
        <div key="file">
          <label htmlFor="proof-file" className="text-xs font-medium text-navy-700 mb-1 block">
            A photo or scan of your student ID, or another ID that shows you are a student
          </label>
          <input
            id="proof-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700"
          />
          <p className="text-xs text-ink-400 mt-1">PDF, JPG or PNG. Only our review team can see it, and it is deleted after we have reviewed it.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send for review'}
      </Button>
    </form>
  )
}
