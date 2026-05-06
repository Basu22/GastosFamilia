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
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
      </div>
    );
  }

  // Si no hay datos para este mes, no mostrar nada
  if (!data?.items?.length) return null;

  return (
    <section className="bg-white dark:bg-neutral-950 rounded-xl border border-gray-200 dark:border-neutral-900 p-4 lg:p-6 mb-6">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Mail size={16} /> Presentación ARCA
      </h2>
      
      <div className="space-y-2">
        {data.items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-900 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-neutral-100 flex items-center gap-2">
                {item.descripcion}
                {item.previsionado && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                    Previsionado
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Venc: {item.fecha_vencimiento 
                  ? new Date(item.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')
                  : 'N/A'}
              </p>
            </div>
            <p className="font-bold text-gray-900 dark:text-neutral-100">
              {formatARS(item.monto)}
            </p>
          </div>
        ))}
      </div>
      
      {/* Total */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-gray-200 dark:border-neutral-800">
        <p className="text-sm font-bold text-gray-700 dark:text-neutral-300">Total ARCA</p>
        <p className="text-lg font-black text-blue-600">{formatARS(data.total)}</p>
      </div>
    </section>
  );
}
