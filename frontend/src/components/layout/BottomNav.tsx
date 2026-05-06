import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, CreditCard, BarChart2, Calculator, Settings } from 'lucide-react';

export default function BottomNav({ className = "" }: { className?: string }) {
  const menuItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Simulador', path: '/simulador', icon: Calculator },
    { name: 'Más', path: '/movimientos', icon: PlusCircle },
    { name: 'Tarjetas', path: '/tarjetas', icon: CreditCard },
    { name: 'Proyecc.', path: '/proyeccion', icon: BarChart2 },
    { name: 'Config.', path: '/configuracion', icon: Settings },
  ];

  return (
    <nav id="bottom-nav-mobile" className={`${className} bg-[#0F1219]/80 backdrop-blur-2xl border-t border-[#334155]/20 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.5)]`}>
      <div className="flex justify-around items-stretch h-full w-full px-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            id={`bottom-nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 relative ${
                isActive ? 'text-[#C7D2FE] scale-110' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center w-full">
                <div className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive ? 'bg-[#C7D2FE]/10 shadow-[0_0_20px_-5px_rgba(199,210,254,0.3)]' : ''
                }`}>
                  <item.icon 
                    size={item.name === 'Más' ? 24 : 20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                </div>
                <span className={`text-[8px] font-bold tracking-[0.1em] uppercase mt-1.5 text-center transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-40'
                }`}>
                  {item.name}
                </span>
                
                {/* Indicador activo inferior */}
                {isActive && (
                  <div className="absolute -bottom-1 w-6 h-1 bg-[#C7D2FE] rounded-full blur-[1px]" />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
