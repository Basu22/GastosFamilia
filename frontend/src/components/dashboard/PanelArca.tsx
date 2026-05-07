import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { getArcaMes } from '../../api/client';
import { formatARS } from '../../utils/format';

interface PanelArcaProps {
  mes: number;
  anio: number;
}

export default function PanelArca({ mes, anio }: PanelArcaProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['arca', mes, anio],
    queryFn: () => getArcaMes(mes, anio),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse px-4 lg:px-0">
        <div className="h-40 bg-white/5 rounded-[24px] border border-white/5" />
      </div>
    );
  }

  // Si no hay datos para este mes, no mostrar nada
  if (!data?.items?.length) return null;

  return (
    <section className="glass-card aura-glow-lavender border-white/5 p-6 lg:p-8 mb-10 overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-aura-lavender/10 rounded-2xl border border-aura-lavender/20 shadow-[0_0_15px_rgba(199,210,254,0.1)]">
          <Mail size={20} className="text-aura-lavender" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-white tracking-tight">Presentación ARCA</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-0.5">Obligaciones Tributarias</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {data.items.map((item: any) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group gap-3 sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="w-1 h-8 rounded-full bg-aura-lavender/30 group-hover:bg-aura-lavender transition-colors" />
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-3">
                  {item.descripcion}
                  {item.previsionado && (
                    <span className="text-[9px] bg-aura-gold/10 text-aura-gold border border-aura-gold/20 px-3 py-0.5 rounded-full uppercase font-bold tracking-widest">
                      Previsionado
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-1">
                  Vencimiento: {item.fecha_vencimiento 
                    ? new Date(item.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest sm:hidden">Importe</span>
              <p className="text-lg font-black text-white tracking-tight sm:text-base sm:font-bold">
                {formatARS(item.monto)}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total Footer */}
      <div className="flex items-center justify-between pt-8 mt-4 border-t border-white/5">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Compromiso Total</p>
          <p className="text-sm font-bold text-white/70">ARCA Mensual</p>
        </div>
        <p className="text-2xl font-black text-aura-lavender tracking-tighter">
          {formatARS(data.total)}
        </p>
      </div>
    </section>
  );
}
