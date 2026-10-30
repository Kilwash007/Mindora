import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Inbox,
  CalendarDays,
  ShieldAlert,
  BarChart3,
  Wallet,
  GraduationCap,
  Building2,
  UserX,
  Settings,
  Coins,
  Activity,
} from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import { useAppState } from '../data/AppState.jsx'

const allItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER', 'SUPPORT'] },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['PLATFORM_ADMIN', 'SUPPORT'] },
  { to: '/admin/professionals', label: 'Professionals', icon: Stethoscope, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER'] },
  { to: '/admin/referrals', label: 'Referrals', icon: Inbox, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER'] },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays, roles: ['PLATFORM_ADMIN', 'SUPPORT'] },
  { to: '/admin/safety', label: 'Safety', icon: ShieldAlert, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER'] },
  { to: '/admin/triage', label: 'Triage', icon: Activity, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER'] },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/payouts', label: 'Payouts', icon: Wallet, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/prices', label: 'Prices', icon: Coins, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/student-rate', label: 'Student Rate', icon: GraduationCap, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/institutions', label: 'Institutions', icon: Building2, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/deletion-requests', label: 'Deletion Requests', icon: UserX, roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['PLATFORM_ADMIN', 'CLINICAL_SAFETY_REVIEWER', 'SUPPORT'] },
]

const roleLabels = {
  PLATFORM_ADMIN: 'Platform admin',
  CLINICAL_SAFETY_REVIEWER: 'Clinical safety reviewer',
  SUPPORT: 'Support',
}

export default function AdminLayout() {
  const { authUser } = useAppState()
  const adminRole = authUser?.role
  const items = allItems.filter((item) => !adminRole || item.roles.includes(adminRole))

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-ink-50">
      <Sidebar
        items={items}
        roleLabel={roleLabels[adminRole] ?? 'Mindora admin'}
        roleName={authUser?.fullName ?? 'Platform team'}
      />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
