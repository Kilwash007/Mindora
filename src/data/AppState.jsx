import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { api, setToken, setRefreshToken, getRefreshToken, clearSession, getToken } from './api.js'
import { SCREENING_QUESTIONS } from './screening.js'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [role, setRoleState] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [selectedProfessional, setSelectedProfessional] = useState(null)
  const [booking, setBooking] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [otpPending, setOtpPending] = useState(null)

  const storeSession = (data) => {
    setToken(data.accessToken)
    setRefreshToken(data.refreshToken)
  }

  const clearLocalState = useCallback(() => {
    setRoleState(null)
    clearSession()
    setAuthUser(null)
    setLastResult(null)
    setBooking(null)
    setOtpPending(null)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await api.logout(refreshToken)
      } catch {
        // best-effort — still clear local state below regardless
      }
    }
    clearLocalState()
  }, [clearLocalState])

  const setRole = useCallback(
    (next) => {
      if (next === null) {
        logout()
      } else {
        setRoleState(next)
      }
    },
    [logout]
  )

  const requestLogin = useCallback(async (role, email, password) => {
    setAuthError(null)
    try {
      const loginFn = { user: api.loginUser, professional: api.loginProfessional, admin: api.loginAdmin }[role]
      const data = await loginFn({ email, password })
      if (data.otpRequired) {
        setOtpPending({ role, email })
        return true
      }
      setAuthError('Unexpected response from server.')
      return false
    } catch (err) {
      setAuthError(err.message)
      return false
    }
  }, [])

  const verifyOtp = useCallback(
    async (code) => {
      if (!otpPending) {
        setAuthError('No login in progress.')
        return false
      }
      setAuthError(null)
      try {
        const data = await api.verifyOtp({ role: otpPending.role, email: otpPending.email, code })
        storeSession(data)
        setAuthUser(data.user ?? data.professional ?? data.admin)
        setRoleState(otpPending.role)
        setOtpPending(null)
        return true
      } catch (err) {
        setAuthError(err.message)
        return false
      }
    },
    [otpPending]
  )

  const cancelOtp = useCallback(() => {
    setOtpPending(null)
    setAuthError(null)
  }, [])

  // consent must be `true` — the backend rejects anything else (missing,
  // false) with a clear error, which surfaces via authError below.
  const registerUser = useCallback(async (fullName, email, password, consent) => {
    setAuthError(null)
    try {
      const data = await api.registerUser({ fullName, email, password, consent })
      storeSession(data)
      setAuthUser(data.user)
      setRoleState('user')
      return true
    } catch (err) {
      setAuthError(err.message)
      return false
    }
  }, [])

  // type is the professional's chosen profession (COUNSELLOR, PSYCHOLOGIST,
  // PSYCHIATRIC_NURSE, ...). The backend validates it and defaults to
  // PSYCHOLOGIST only if none is sent.
  const registerProfessional = useCallback(async (fullName, email, password, type) => {
    setAuthError(null)
    try {
      const payload = { fullName, email, password }
      if (type) payload.type = type
      const data = await api.registerProfessional(payload)
      storeSession(data)
      setAuthUser(data.professional)
      setRoleState('professional')
      return true
    } catch (err) {
      setAuthError(err.message)
      return false
    }
  }, [])

  // answersById: { [questionId]: numericValue } — keyed by the screening.js
  // question ids (phq9_1, gad7_1, cageaid_1, ...). domain is the instrument
  // (PHQ9/GAD7/CAGEAID). Sent to POST /api/v1/screenings, which scores it on
  // the server and, for an ACUTE result, opens a free urgent triage.
  const submitCheckIn = useCallback(async (answersById) => {
    const answers = SCREENING_QUESTIONS.map((q) => ({
      domain: q.domain,
      questionId: q.id,
      value: answersById[q.id],
    }))
    const result = await api.submitScreening(answers)
    setLastResult(result)
    return result
  }, [])

  const value = useMemo(
    () => ({
      role,
      setRole,
      authUser,
      authError,
      isAuthenticated: Boolean(getToken()),
      otpPending,
      requestLogin,
      verifyOtp,
      cancelOtp,
      registerUser,
      registerProfessional,
      submitCheckIn,
      lastResult,
      selectedProfessional,
      setSelectedProfessional,
      booking,
      setBooking,
    }),
    [
      role,
      authUser,
      authError,
      otpPending,
      requestLogin,
      verifyOtp,
      cancelOtp,
      registerUser,
      registerProfessional,
      submitCheckIn,
      lastResult,
      selectedProfessional,
      booking,
      setRole,
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
