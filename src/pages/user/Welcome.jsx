import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import StudentProofForm from '../../components/StudentProofForm.jsx'
import { api } from '../../data/api.js'

// The short step after signing up with a code whose programme asks for proof
// that you are a student. It is also where someone comes back to check the
// state of their proof. Everything works without it: it can be skipped.
export default function Welcome() {
  const [programme, setProgramme] = useState(undefined) // undefined = loading, null = none
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    api
      .getMyInstitution()
      .then(setProgramme)
      .catch((err) => {
        setProgramme(null)
        setError(err.message)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (programme === undefined) {
    return (
      <div className="p-8 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    )
  }

  // Nothing to do here without a programme that asks for proof.
  if (!programme || !programme.requiresStudentProof) {
    return error ? (
      <div className="p-8">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <Link to="/app" className="text-sm font-semibold text-navy-800 underline">
          Go to my dashboard
        </Link>
      </div>
    ) : (
      <Navigate to="/app" replace />
    )
  }

  const status = programme.proofStatus // NONE | PENDING | REJECTED | APPROVED
  const freeTriage = programme.coversTriage

  return (
    <div>
      <PageHeader
        eyebrow={programme.name}
        title="One more step"
        subtitle={
          freeTriage
            ? `${programme.name} gives you a free triage and covered sessions once we have checked that you are a student.`
            : `${programme.name} offers cover to students. We just need to check that you are one.`
        }
      />

      <div className="p-4 md:p-8 max-w-xl space-y-4">
        {status === 'APPROVED' && (
          <Card className="bg-teal-50/60 border-teal-100 text-center py-8 space-y-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600 mx-auto" />
            <p className="font-semibold text-navy-800">You are verified</p>
            <p className="text-sm text-ink-600">Your cover applies automatically. Start with the free screening.</p>
            <Button as="link" to="/app/check-in" variant="accent">
              Start the free screening
            </Button>
          </Card>
        )}

        {status === 'PENDING' && (
          <Card className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-navy-800">
              <Clock className="h-5 w-5 text-amber-600" /> Your proof is being reviewed
            </div>
            <p className="text-sm text-ink-600">
              We review these ourselves, as soon as we can. You can take the free screening now. If you need a triage
              before we have finished, it costs KES 500, and it is free once your proof is approved.
            </p>
            <Button as="link" to="/app/check-in" variant="accent">
              Start the free screening
            </Button>
          </Card>
        )}

        {(status === 'NONE' || status === 'REJECTED') && (
          <Card className="space-y-4">
            {status === 'REJECTED' && (
              <p className="text-sm text-red-600">Your last proof was not approved. You can send another below.</p>
            )}
            <p className="text-sm text-ink-600">
              Send a photo or scan of your student ID (or another ID that shows you are a student), or your school
              email address. Until we have approved it, a triage costs KES 500. You can also skip this and add it later
              from your dashboard.
            </p>
            <StudentProofForm onSubmitted={load} />
          </Card>
        )}

        {status !== 'APPROVED' && (
          <p className="text-center">
            <Link to="/app" className="text-sm font-semibold text-navy-800 underline">
              Skip for now
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
