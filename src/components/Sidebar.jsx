import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAppState } from '../data/AppState.jsx'

export default function Sidebar({ items, roleLabel, roleName }) {
  const navigate = useNavigate()
  const { setRole } = useAppState()
  const [open, setOpen] = useState(false)

  const handleSignOut = () => {
    setRole(null)
    navigate('/')
  }

  const closeDrawer = () => setOpen(false)

  return (
    <>
      {/* Mobile top bar — only shown below the md breakpoint */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-navy-800 text-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-400 flex items-center justify-center font-display font-bold text-navy-900">
            M
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Mindora</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Backdrop — mobile only, tapping it closes the drawer */}
      {open && (
        <div onClick={closeDrawer} className="md:hidden fixed inset-0 bg-black/40 z-40" />
      )}

      {/* Sidebar — a slide-out drawer on mobile, a static sidebar on md+ */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-navy-800 text-white flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-teal-400 flex items-center justify-center font-display font-bold text-navy-900">
                M
              </div>
              <span className="font-display font-bold text-lg tracking-tight">Mindora</span>
            </div>
            <p className="text-[11px] text-navy-200 mt-1 uppercase tracking-wide">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-navy-100 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 pb-3">
            <p className="text-sm font-semibold">{roleName}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-navy-200 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}