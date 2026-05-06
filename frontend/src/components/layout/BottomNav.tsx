import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, CreditCard, BarChart2, Calculator, Settings } from 'lucide-react';

export default function BottomNav({ className = "" }: { className?: string }) {
  const menuItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Simulador', path: '/simulador', icon: Calculator },
    { name: 'Movimientos', path: '/movimientos', icon: PlusCircle },
    { name: 'Tarjetas', path: '/tarjetas', icon: CreditCard },
    { name: 'Proyección', path: '/proyeccion', icon: BarChart2 },
    { name: 'Config.', path: '/configuracion', icon: Settings },
  ];

  return (
    <nav id="bottom-nav-mobile" className={`${className} bg-white dark:bg-black border-t border-gray-200 dark:border-neutral-800 pb-safe pt-1 px-1 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] dark:shadow-none transition-colors`}>
      <div className="flex justify-around items-stretch h-full w-full">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            id={`bottom-nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center h-full transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-neutral-500'
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center w-full py-1">
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <item.icon 
                    size={item.name === 'Movimientos' ? 26 : 22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                </div>
                <span className={`text-[9px] font-bold tracking-tight uppercase mt-1 text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.name}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
