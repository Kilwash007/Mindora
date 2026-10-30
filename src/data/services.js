import { useEffect, useState } from 'react'
import { api } from './api.js'

// Service names, who can deliver them, and small formatting helpers shared
// by the triage and booking screens. The server enforces every rule here;
// this file only decides what to show. Keep in step with
// mindora-backend/src/lib/triage.js.

export const SERVICE_LABELS = {
  TRIAGE: 'Triage',
  COUNSELLING: 'Counselling',
  PSYCHOLOGY: 'Psychology',
  PSYCHIATRY_INITIAL: 'Psychiatry (first visit)',
  PSYCHIATRY_FOLLOWUP: 'Psychiatry (follow-up)',
}

// Which services each professional type delivers.
export const SERVICES_BY_TYPE = {
  COUNSELLOR: ['COUNSELLING'],
  PSYCHIATRIC_NURSE: ['COUNSELLING'],
  PSYCHIATRIC_CLINICAL_OFFICER: ['COUNSELLING'],
  PSYCHOLOGIST: ['COUNSELLING', 'PSYCHOLOGY'],
  CLINICAL_PSYCHOLOGIST: ['COUNSELLING', 'PSYCHOLOGY'],
  PSYCHIATRIST: ['PSYCHIATRY_INITIAL', 'PSYCHIATRY_FOLLOWUP'],
}

export const CARE_LEVEL_LABELS = {
  COUNSELLING: 'Counselling',
  PSYCHOLOGY: 'Psychology',
  PSYCHIATRY: 'Psychiatry',
  EMERGENCY_REFERRAL: 'Emergency care',
}

export const URGENCY_LABELS = { ROUTINE: 'Routine', SOON: 'Soon', URGENT: 'Urgent' }

export const TRIAGE_STATUS_LABELS = {
  AWAITING_PAYMENT: 'Awaiting payment',
  QUEUED: 'Waiting for a clinician',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const TRIAGE_STATUS_TONES = {
  AWAITING_PAYMENT: 'elevated',
  QUEUED: 'teal',
  IN_PROGRESS: 'teal',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
}

export const RISK_TONES = { LOW: 'low', ELEVATED: 'elevated', HIGH: 'high', ACUTE: 'acute' }

export function formatKes(amount) {
  if (amount === null || amount === undefined) return 'Not listed'
  return `KES ${Number(amount).toLocaleString()}`
}

export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// The services a professional type delivers, with the live price of each.
export function servicesFor(type, priceOf) {
  return (SERVICES_BY_TYPE[type] ?? []).map((service) => ({
    service,
    label: SERVICE_LABELS[service],
    priceKes: priceOf(service),
  }))
}

// Loads the public price list. Prices are shown for information only: the
// amount charged is always worked out on the server.
export function usePrices() {
  const [prices, setPrices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .getPrices()
      .then((data) => !cancelled && setPrices(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const priceOf = (service) => prices?.find((p) => p.service === service)?.priceKes ?? null
  return { prices, error, priceOf }
}

// How this person's triage is covered, for wording only; the server decides
// who is actually covered.
//   coveredBy   - the programme paying for it, shown as "free, covered by ..."
//   proofNeeded - set when the programme would cover it but is waiting for the
//                 person's proof of being a student: { programme, status }
//                 where status is NONE, PENDING or REJECTED
export function useTriageCover() {
  const [cover, setCover] = useState({ coveredBy: null, proofNeeded: null })

  useEffect(() => {
    let cancelled = false
    api
      .getMyInstitution()
      .then((inst) => {
        if (cancelled || !inst || inst.status !== 'ACTIVE' || !inst.coversTriage || inst.triageCoveredUsed) return
        if (inst.requiresStudentProof && inst.proofStatus !== 'APPROVED') {
          setCover({ coveredBy: null, proofNeeded: { programme: inst.name, status: inst.proofStatus ?? 'NONE' } })
        } else {
          setCover({ coveredBy: inst.name, proofNeeded: null })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return cover
}
