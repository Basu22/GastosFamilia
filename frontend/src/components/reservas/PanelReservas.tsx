import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSaldos, SaldoReserva } from '../../api/reservas';
import { Wallet, ArrowRightLeft, ArrowDownCircle } from 'lucide-react';
import { formatARS } from '../../utils/format';
import { ModalAjusteReserva } from './ModalAjusteReserva';
import { ModalFondeoReserva } from './ModalFondeoReserva';

interface Props {
  mes: number;
  anio: number;
  disponible: number;
}

export const PanelReservas: React.FC<Props> = ({ mes, anio, disponible }) => {
  const [reservaAjuste, setReservaAjuste] = useState<SaldoReserva | null>(null);
  const [reservaFondeo, setReservaFondeo] = useState<SaldoReserva | null>(null);

  const { data: reservas, isLoading } = useQuery({
    queryKey: ['saldos-reservas', mes, anio],
    queryFn: () => getSaldos(mes, anio)
  });

  if (isLoading || !reservas || reservas.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="text-gray-500" size={20} />
        <h2 className="text-lg font-bold text-gray-800 dark:text-neutral-200">Sobres / Reservas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reservas.map(res => {
          const isDanger = res.saldo_actual < 0;
          return (
            <div key={res.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* Color Accent Line */}
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: res.color }} />
              
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-800 dark:text-neutral-200 truncate pr-2" style={{ color: res.color }}>
                  {res.nombre}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setReservaFondeo(res)}
                    className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-500"
                    title="Fondear Reserva"
                  >
                    <ArrowDownCircle size={14} />
                  </button>
                  <button 
                    onClick={() => setReservaAjuste(res)}
                    className="p-1.5 bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-500"
                    title="Reasignar / Liberar saldo"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Saldo Acumulado</p>
                <p className={`text-2xl font-bold ${isDanger ? 'text-red-500' : 'text-gray-900 dark:text-neutral-100'}`}>
                  {formatARS(res.saldo_actual)}
                </p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-neutral-400">Asignado mes</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">+{formatARS(res.asignacion_mes)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-neutral-400">Consumido mes</span>
                  <span className="font-medium text-red-500 dark:text-red-400">-{formatARS(res.consumo_mes)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {reservaAjuste && (
        <ModalAjusteReserva 
          reserva={reservaAjuste} 
          todasReservas={reservas}
          mes={mes}
          anio={anio}
          onClose={() => setReservaAjuste(null)} 
        />
      )}

      {reservaFondeo && (
        <ModalFondeoReserva
          reserva={reservaFondeo}
          mes={mes}
          anio={anio}
          disponible={disponible}
          onClose={() => setReservaFondeo(null)}
        />
      )}
    </div>
  );
};
