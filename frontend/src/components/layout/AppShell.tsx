import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useThemeStore } from '../../stores/themeStore';
import { Sun, Moon } from 'lucide-react';

interface AppShellProps {
  children?: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div id="app-root" className="flex min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Sidebar — SOLO desktop */}
      <aside id="app-sidebar" className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 dark:border-neutral-800 lg:bg-white dark:lg:bg-black lg:z-30 transition-colors">
        <Sidebar />
      </aside>

      {/* Contenido principal */}
      <div id="app-main-container" className="flex-1 lg:ml-60">
        {/* TopBar — SOLO mobile */}
        <header id="app-topbar-mobile" className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 px-4 h-16 flex items-center justify-between transition-colors">
          <span id="app-brand-mobile" className="text-blue-600 dark:text-blue-500 font-bold text-xl tracking-tight">Gastos Familiares</span>
          <div className="flex items-center gap-2">
            <button 
              id="btn-toggle-theme-mobile"
              onClick={toggleTheme}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button id="btn-user-profile-mobile" className="flex items-center justify-center bg-gray-100 dark:bg-neutral-900 w-11 h-11 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors" aria-label="User profile">
              <span className="text-xl">👤</span>
            </button>
          </div>
        </header>

        {/* Contenido de la página */}
        <main id="app-main-content" className="p-4 lg:p-8 pb-24 lg:pb-8">
          {children ? children : <Outlet />}
        </main>
      </div>

      {/* BottomNav — SOLO mobile */}
      <BottomNav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex lg:hidden h-16" />
    </div>
  );
}
