import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardCheck,
  LineChart,
  Search,
  CalendarDays,
  BookOpen,
  Sparkles,
  MessageCircle,
  Users,
  GraduationCap,
  Settings,
  Stethoscope,
} from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import { useAppState } from '../data/AppState.jsx'

const items = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/check-in', label: 'Free screening', icon: ClipboardCheck },
  { to: '/app/triage', label: 'My triage', icon: Stethoscope },
  { to: '/app/wellbeing', label: 'My wellbeing', icon: LineChart },
  { to: '/app/find-a-professional', label: 'Find a professional', icon: Search },
  { to: '/app/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
  { to: '/app/groups', label: 'Support groups', icon: Users },
  { to: '/app/student-rate', label: 'Student Rate', icon: GraduationCap },
  { to: '/app/resources', label: 'Resources', icon: BookOpen },
  { to: '/app/mindora-ai', label: 'Mindora AI', icon: Sparkles },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export default function UserLayout() {
  const { authUser } = useAppState()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-ink-50">
      <Sidebar items={items} roleLabel="Individual account" roleName={authUser?.fullName ?? 'Account'} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
