import React, { useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Activity, Pill, ClipboardCheck, History, LogOut, Heart, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ConsentBanner } from './ConsentBanner';

export function Layout() {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  const navItems = [
    { to: '/pre-anestesica', icon: ClipboardCheck, label: 'Avaliação' },
    { to: '/cirurgias', icon: Scissors, label: 'Cirurgias' },
    { to: '/gasometria', icon: Activity, label: t('common.gasometry') },
    { to: '/hemodinamica', icon: Heart, label: 'Hemo' },
    { to: '/drogas', icon: Pill, label: t('common.drugs') },
    { to: '/historico', icon: History, label: t('common.history') },
  ];

  const handleNavClick = (to: string) => {
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
    if (isActive && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#050505] text-zinc-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ANESTHESIUM</h1>
        </div>
        <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative pb-32 scroll-smooth"
      >
        <Outlet />
      </main>

      <ConsentBanner />

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50 px-4">
        <nav className="flex items-center gap-1 p-1.5 glass-panel rounded-full pointer-events-auto shadow-2xl shadow-black/50 overflow-x-auto scrollbar-none max-w-[calc(100vw-2rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => handleNavClick(item.to)}
              className={({ isActive }) =>
                `relative flex items-center justify-center w-12 h-12 min-w-[3rem] rounded-full transition-all duration-300 ${
                  isActive
                    ? 'text-black'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 relative z-10" strokeWidth={isActive ? 2.5 : 1.5} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
