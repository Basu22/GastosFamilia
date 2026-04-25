import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatARS } from '../../utils/format';

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  variant = 'default', 
  subtitle 
}) => {
  const colors = {
    default: 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
  };

  return (
    <article id={`metric-card-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} className={`p-3 lg:p-4 rounded-xl shadow-sm border flex flex-col gap-1 lg:gap-2 transition-all ${colors[variant]}`}>
      <div className="flex items-center gap-1.5 opacity-70">
        <Icon size={14} className="lg:w-4 lg:h-4" />
        <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-lg lg:text-2xl font-black mt-1 leading-tight">
        {formatARS(value)}
      </p>
      {subtitle && (
        <p className="text-[10px] lg:text-xs mt-0.5 lg:mt-1 opacity-60 font-semibold">
          {subtitle}
        </p>
      )}
    </article>
  );
};

export default MetricCard;
