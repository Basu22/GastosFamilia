import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface AppShellProps {
  children?: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div 
      id="app-root" 
      className="flex min-h-screen bg-[#0F1219] font-sans text-gray-100 antialiased selection:bg-[#C7D2FE]/30 selection:text-[#C7D2FE]"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #1E293B 0%, #0F1219 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Sidebar — SOLO desktop */}
      <aside 
        id="app-sidebar" 
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-[#0F1219] border-r border-[#334155]/30 lg:z-30 transition-all"
      >
        <Sidebar />
      </aside>

      {/* Contenido principal */}
      <div id="app-main-container" className="flex-1 lg:ml-64">
        {/* TopBar — SOLO mobile */}
        <header 
          id="app-topbar-mobile" 
          className="lg:hidden sticky top-0 z-20 bg-[#0F1219]/80 backdrop-blur-xl border-b border-[#334155]/30 px-6 h-20 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C7D2FE] blur-xl opacity-30 rounded-full" />
              <img
                id="app-brand-mobile-icon"
                src="/aura-icon.png"
                alt="Aura"
                className="relative w-12 h-12 drop-shadow-xl"
              />
            </div>
            <div className="flex flex-col">
              <span id="app-brand-mobile" className="text-white font-bold text-xl tracking-[0.05em] leading-none">Aura</span>
              <span className="text-[9px] tracking-[0.15em] text-[#A7F3D0] font-bold uppercase opacity-70 mt-1">Tu Zen Financiero</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              id="btn-user-profile-mobile" 
              className="flex items-center justify-center bg-[#1E293B]/50 border border-[#334155]/50 w-12 h-12 rounded-2xl hover:bg-[#1E293B] transition-all active:scale-95" 
              aria-label="User profile"
            >
              <span className="text-xl">👤</span>
            </button>
          </div>
        </header>

        {/* Contenido de la página */}
        <main id="app-main-content" className="p-6 lg:p-12 pb-28 lg:pb-12 max-w-7xl mx-auto w-full">
          {children ? children : <Outlet />}
        </main>
      </div>

      {/* BottomNav — SOLO mobile */}
      <BottomNav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F1219]/90 backdrop-blur-2xl border-t border-[#334155]/30 flex lg:hidden h-20 pb-4" />
    </div>
  );
}
