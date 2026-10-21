import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAppState } from '../data/AppState.jsx'

// Each portal has its own navy tone and an optional tag under the logo.
// The portal is read from the URL, so the three layouts need no changes.
const PORTALS = {
  user: { bg: 'bg-navy-800', tag: null },
  professional: { bg: 'bg-navy-900', tag: 'FOR PROFESSIONALS' },
  admin: { bg: 'bg-navy-950', tag: 'ADMIN CONSOLE' },
}

function portalFor(pathname) {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/pro')) return 'professional'
  return 'user'
}

// The logo file is turned solid white with a CSS filter, so it reads on navy.
function Logo({ tag, className = 'w-24' }) {
  return (
    <div>
      <img src="/logo-full.png" alt="Mindora" className={`h-auto brightness-0 invert ${className}`} />
      {tag && <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-brand-amber">{tag}</p>}
    </div>
  )
}

export default function Sidebar({ items, roleLabel, roleName }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setRole } = useAppState()
  const [open, setOpen] = useState(false)

  const portal = portalFor(pathname)
  const { bg, tag } = PORTALS[portal]
  const initial = (roleName || '?').trim().charAt(0).toUpperCase()

  const handleSignOut = () => {
    setRole(null)
    navigate('/')
  }

  const closeDrawer = () => setOpen(false)

  return (
    <>
      {/* Mobile top bar: only shown below the md breakpoint */}
      <header className={`md:hidden flex items-center justify-between px-4 py-3 ${bg} text-white sticky top-0 z-30`}>
        <Logo tag={tag} className="w-20" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Backdrop: mobile only, tapping it closes the drawer */}
      {open && <div onClick={closeDrawer} className="md:hidden fixed inset-0 bg-black/40 z-40" />}

      {/* Sidebar: a slide-out drawer on mobile, a static sidebar on md+ */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 ${bg} text-white flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="px-6 py-6 flex items-start justify-between">
          <Logo tag={tag} className="w-24" />
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-navy-100 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 space-y-3">
          {portal === 'user' && (
            <div className="rounded-2xl bg-navy-700/70 px-4 py-3 text-xs leading-relaxed text-white">
              <span className="font-bold">Need help right now?</span> Call 999 or 112, or Kenya Red Cross on 1199, free
              and 24 hours.
            </div>
          )}

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center gap-3 px-3 pb-2">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900"
              >
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{roleName}</p>
                <p className="truncate text-xs text-navy-200">{roleLabel}</p>
              </div>
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
        </div>
      </aside>
    </>
  )
}