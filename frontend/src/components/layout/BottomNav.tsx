import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, PlusCircle, CreditCard, BarChart2 } from 'lucide-react';

export default function BottomNav({ className = "" }: { className?: string }) {
  const menuItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Gastos', path: '/gastos', icon: Wallet },
    { name: 'Nuevo', path: '/nuevo', icon: PlusCircle },
    { name: 'Tarjetas', path: '/tarjetas', icon: CreditCard },
    { name: 'Proyección', path: '/proyeccion', icon: BarChart2 },
  ];

  return (
    <nav id="bottom-nav-mobile" className={`${className} bg-white dark:bg-black border-t border-gray-200 dark:border-neutral-800 pb-safe pt-1 px-1 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] dark:shadow-none transition-colors`}>
      <div className="flex justify-around items-stretch h-full">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            id={`bottom-nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-3 px-1 transition-colors ${
                isActive ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 dark:text-neutral-500 active:text-gray-900 dark:active:text-neutral-300'
              }`
            }
          >
            <item.icon className={`w-5 h-5 ${item.name === 'Nuevo' ? 'w-6 h-6 text-blue-500 dark:text-blue-400' : ''}`} />
            <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
