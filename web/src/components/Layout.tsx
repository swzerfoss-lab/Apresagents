import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Palette,
  History,
  Mountain,
  Sparkles,
  Workflow,
  Wand2,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Content Workflow', href: '/workflow', icon: Workflow },
  { name: 'Creative Studio', href: '/studio', icon: Wand2 },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Brand Voice', href: '/brand', icon: Palette },
  { name: 'History', href: '/history', icon: History },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-alpine-500 to-purple-600">
            <Mountain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Apres Feels</h1>
            <p className="text-xs text-slate-500">Content Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-alpine-50 text-alpine-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Agent Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-alpine-50 to-purple-50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4 text-alpine-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">AI Agents</p>
              <p className="text-xs text-slate-500">6 agents ready</p>
            </div>
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
