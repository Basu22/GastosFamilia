import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, CreditCard, LogOut, BarChart2, Settings, Calculator } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Movimientos', path: '/movimientos', icon: PlusCircle },
    { name: 'Tarjetas', path: '/tarjetas', icon: CreditCard },
    { name: 'Proyección', path: '/proyeccion', icon: BarChart2 },
    { name: 'Simulador', path: '/simulador', icon: Calculator },
    { name: 'Configuración', path: '/configuracion', icon: Settings },
  ];

  return (
    <div id="sidebar-container" className="flex flex-col h-full bg-[#0F1219] text-gray-200">
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center gap-4 group cursor-pointer">
          {/* Ícono de anillo de alta resolución */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-[#C7D2FE] blur-2xl opacity-20 rounded-full scale-110" />
            <img
              id="sidebar-logo-icon"
              src="/aura-icon.png"
              alt="Aura"
              className="relative w-14 h-14 drop-shadow-2xl transition-transform duration-500 group-hover:rotate-12"
            />
          </div>

          {/* Texto nativo (Nítido) */}
          <div className="flex flex-col">
            <h1 id="sidebar-title" className="text-2xl font-bold tracking-[0.1em] text-white leading-none">Aura</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#A7F3D0] uppercase opacity-80 mt-1.5">Tu Zen Financiero</p>
          </div>
        </div>
      </div>

      <nav id="sidebar-nav" className="flex-1 px-4 py-4 space-y-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            id={`sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-medium group ${isActive
                ? 'bg-[#1E293B] border border-[#334155]/50 text-[#C7D2FE] shadow-lg shadow-black/20'
                : 'text-gray-400 hover:text-gray-100 hover:bg-[#1E293B]/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#C7D2FE]' : 'text-gray-500'
                  }`} strokeWidth={2} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-[#334155]/20 space-y-3">
        <button
          id="btn-sidebar-logout"
          onClick={() => { /* TODO: logout handler */ }}
          className="flex items-center gap-4 w-full px-5 py-4 text-[#FCA5A5]/80 hover:text-[#FCA5A5] hover:bg-[#FCA5A5]/10 rounded-2xl transition-all font-medium group"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
