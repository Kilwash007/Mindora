import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  Users,
  CalendarDays,
  ClipboardList,
  Repeat,
  BarChart3,
  MessageCircle,
  UsersRound,
  Wallet,
  BookOpen,
  Settings,
  Loader2,
} from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import { useAppState } from '../data/AppState.jsx'
import { api } from '../data/api.js'
import AgreementAcceptance from '../pages/professional/AgreementAcceptance.jsx'

const items = [
  { to: '/pro', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pro/referrals', label: 'Referrals', icon: Inbox },
  { to: '/pro/clients', label: 'Clients', icon: Users },
  { to: '/pro/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/pro/messages', label: 'Messages', icon: MessageCircle },
  { to: '/pro/groups', label: 'Support groups', icon: UsersRound },
  { to: '/pro/earnings', label: 'Earnings', icon: Wallet },
  { to: '/pro/assessments', label: 'Assessments', icon: ClipboardList },
  { to: '/pro/follow-ups', label: 'Follow-ups', icon: Repeat },
  { to: '/pro/reports', label: 'Reports', icon: BarChart3 },
  { to: '/pro/resources', label: 'Clinical resources', icon: BookOpen },
  { to: '/pro/settings', label: 'Settings', icon: Settings },
]

export default function ProfessionalLayout() {
  const { authUser } = useAppState()
  const [agreement, setAgreement] = useState(null) // null = loading
  const [error, setError] = useState(null)

  const checkAgreement = () => {
    api
      .getAgreementStatus()
      .then(setAgreement)
      .catch((err) => setError(err.message))
  }

  useEffect(checkAgreement, [])

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-red-600 p-8">{error}</div>
  }

  if (agreement === null) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-ink-500 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading...
      </div>
    )
  }

  if (!agreement.accepted) {
    return <AgreementAcceptance currentVersion={agreement.currentVersion} onAccepted={checkAgreement} />
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-ink-50">
      <Sidebar
        items={items}
        roleLabel="Professional account"
        roleName={authUser?.fullName ?? 'Account'}
      />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}