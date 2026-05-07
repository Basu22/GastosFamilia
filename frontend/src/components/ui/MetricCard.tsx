import { FC } from 'react';
import { LucideIcon } from 'lucide-react';
import { formatARS } from '../../utils/format';

interface MetricCardProps {
  id?: string;
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  subtitle?: string;
}

const MetricCard: FC<MetricCardProps> = ({ 
  id,
  label, 
  value, 
  icon: Icon, 
  variant = 'default', 
  subtitle 
}) => {
  const styles = {
    default: {
      card: 'glass-card aura-glow-lavender border-[#C7D2FE]/10',
      label: 'text-[#C7D2FE]',
      value: 'text-white'
    },
    success: {
      card: 'glass-card aura-glow-mint border-[#A7F3D0]/20',
      label: 'text-[#A7F3D0]',
      value: 'text-[#A7F3D0]'
    },
    danger: {
      card: 'glass-card aura-glow-coral border-[#FCA5A5]/20',
      label: 'text-[#FCA5A5]',
      value: 'text-[#FCA5A5]'
    },
    warning: {
      card: 'glass-card aura-glow-gold border-[#FDE68A]/20',
      label: 'text-[#FDE68A]',
      value: 'text-white'
    }
  };

  const currentStyle = styles[variant];

  return (
    <article 
      id={id || `metric-card-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} 
      className={`p-6 lg:p-8 flex flex-col gap-3 transition-all duration-500 hover:scale-[1.02] group relative ${currentStyle.card}`}
    >
      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${currentStyle.label}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-[0.15em] ${currentStyle.label}`}>
          {label}
        </p>
      </div>
      
      <div className="flex flex-col gap-1">
        <p className={`font-bold tracking-tighter ${currentStyle.value} ${
          formatARS(value).length > 14 ? 'text-lg lg:text-2xl' : 
          formatARS(value).length > 10 ? 'text-xl lg:text-3xl' : 
          'text-2xl lg:text-4xl'
        }`}>
          {variant === 'success' ? '+' : variant === 'danger' ? '-' : ''} {formatARS(value)}
        </p>
        {subtitle && (
          <p className="text-xs lg:text-sm font-medium text-gray-400/80 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Sutil línea de acento superior */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-full opacity-50 ${
        variant === 'success' ? 'bg-[#A7F3D0]' : 
        variant === 'danger' ? 'bg-[#FCA5A5]' : 
        variant === 'warning' ? 'bg-[#FDE68A]' : 'bg-[#C7D2FE]'
      }`} />
    </article>
  );
};

export default MetricCard;
