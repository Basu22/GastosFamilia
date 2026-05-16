import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAsignacion, SaldoReserva } from '../../api/reservas';
import { X, ArrowDownCircle } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

interface Props {
  reserva: SaldoReserva;
  mes: number;
  anio: number;
  disponible: number;
  onClose: () => void;
}

export const ModalFondeoReserva: React.FC<Props> = ({ reserva, mes, anio, disponible, onClose }) => {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState<number>(0);
  const [notas] = useState('');

  const mutation = useMutation({
    mutationFn: () => createAsignacion({
      reserva_id: reserva.id,
      mes,
      anio,
      monto,
      notas
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saldos-reservas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-neutral-800">
        <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-950">
          <h3 className="font-bold flex items-center gap-2 text-gray-900 dark:text-neutral-100">
            <ArrowDownCircle size={18} className="text-emerald-500" />
            Fondear Reserva
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-lg transition-colors text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="text-center p-3 bg-gray-50 dark:bg-neutral-950 rounded-xl border border-gray-100 dark:border-neutral-800">
            <p className="text-xs text-gray-500 mb-1">Destino</p>
            <p className="font-bold text-gray-900 dark:text-neutral-100">{reserva.nombre}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monto a Asignar</label>
            <NumericFormat 
              autoFocus
              value={monto || ''}
              onValueChange={(v) => setMonto(v.floatValue || 0)}
              thousandSeparator="." decimalSeparator="," prefix="$ " 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-lg font-black focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-600 dark:text-emerald-400"
              placeholder="$ 0"
            />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-3 px-1">
              <span className="text-gray-500">Efectivo Disponible:</span>
              <span className={`font-bold ${disponible < monto ? 'text-red-500' : 'text-gray-900 dark:text-neutral-100'}`}>
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(disponible)}
              </span>
            </div>
            
            {disponible < monto && (
              <p className="text-[10px] text-red-500 mb-3 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                El monto de fondeo supera el disponible proyectado de este mes.
              </p>
            )}

            <button 
              type="submit" 
              disabled={mutation.isPending || monto <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {mutation.isPending ? 'Procesando...' : 'Confirmar Fondeo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
