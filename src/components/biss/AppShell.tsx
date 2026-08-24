import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ScrollText, Clock, Lock, Settings,
  Shield, LogOut, Wifi, Menu, X, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { realtime } from '../../lib/realtime';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/personnel',   icon: Users,           label: 'Personnel' },
  { to: '/registre',    icon: ScrollText,      label: 'Registre' },
  { to: '/tracabilite', icon: Clock,           label: 'Traçabilité' },
  { to: '/serrure',     icon: Lock,            label: 'Serrure' },
  { to: '/reglages',    icon: Settings,        label: 'Réglages' },
];

function Clock24() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-sm text-[#E8B400]">
      {time.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const { user, deconnexion } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rtConnected, setRtConnected] = useState(realtime.connected);

  useEffect(() => {
    realtime.onConnect(() => setRtConnected(true));
    const unsub = realtime.on('heartbeat', () => {});
    return unsub;
  }, []);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-700/60 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A3A8F] shadow-lg">
          <span className="font-black text-white text-lg">B</span>
        </div>
        <div>
          <p className="font-bold text-white leading-tight tracking-wide">BISS 2</p>
          <p className="text-[10px] text-[#E8B400] font-semibold tracking-widest uppercase">Access Control</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to} to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-[#1A3A8F] text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/60 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={cn('size-2 rounded-full', rtConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500')} />
          {rtConnected ? 'Temps réel actif' : 'Déconnecté'}
        </div>
        {user?.societe_nom && (
          <p className="text-xs text-slate-500 truncate">{user.societe_nom}</p>
        )}
        <button
          onClick={() => { deconnexion(); navigate('/connexion'); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="size-4" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0F172A] text-[#E2E8F0]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-700/60 bg-[#0D1526]">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex h-full w-64 flex-col bg-[#0D1526] shadow-xl">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-700/60 bg-[#0D1526]/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white">
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-[#1A3A8F]" />
              <h1 className="font-semibold text-white text-sm">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock24 />
            <span className="hidden sm:block text-xs text-slate-500">{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
