import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, CreditCard, LogOut, Sun, Moon, BarChart2, Settings } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export default function Sidebar() {
  const { isDark, toggleTheme } = useThemeStore();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Movimientos', path: '/movimientos', icon: PlusCircle },
    { name: 'Tarjetas', path: '/tarjetas', icon: CreditCard },
    { name: 'Proyección', path: '/proyeccion', icon: BarChart2 },
    { name: 'Configuración', path: '/configuracion', icon: Settings },
  ];

  return (
    <div id="sidebar-container" className="flex flex-col h-full bg-white dark:bg-black text-gray-800 dark:text-neutral-200 transition-colors">
      <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
        <h1 id="sidebar-title" className="text-2xl font-bold text-blue-600 dark:text-blue-500">Gastos Familiares</h1>
      </div>
      
      <nav id="sidebar-nav" className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            id={`sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-neutral-100'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-neutral-800 space-y-2">
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900 rounded-xl transition-colors font-medium"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
        <button 
          id="btn-sidebar-logout"
          onClick={() => { /* TODO: logout handler */ }}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
