import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAjuste, SaldoReserva } from '../../api/reservas';
import { NumericFormat } from 'react-number-format';
import { formatARS } from '../../utils/format';

interface Props {
  reserva: SaldoReserva;
  todasReservas: SaldoReserva[];
  mes: number;
  anio: number;
  onClose: () => void;
}

export const ModalAjusteReserva: React.FC<Props> = ({ reserva, todasReservas, mes, anio, onClose }) => {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<'reasignacion' | 'liberacion'>('reasignacion');
  const [monto, setMonto] = useState<number>(0);
  const [destinoId, setDestinoId] = useState<number>(0);
  const [notas] = useState('');

  const mutation = useMutation({
    mutationFn: () => createAjuste({
      tipo,
      reserva_origen_id: reserva.id,
      reserva_destino_id: tipo === 'reasignacion' ? destinoId : undefined,
      monto,
      mes,
      anio,
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
    if (monto <= 0) return alert('El monto debe ser mayor a 0');
    if (monto > reserva.saldo_actual) return alert('El monto no puede superar el saldo actual');
    if (tipo === 'reasignacion' && (!destinoId || destinoId === reserva.id)) {
      return alert('Debes seleccionar una reserva destino válida');
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-neutral-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
              Ajustar Saldo
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              Desde <span className="font-semibold" style={{ color: reserva.color }}>{reserva.nombre}</span> (Saldo: {formatARS(reserva.saldo_actual)})
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Tipo de Ajuste */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Acción a realizar</label>
            <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTipo('reasignacion')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${tipo === 'reasignacion' ? 'bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mover a otra reserva
              </button>
              <button
                type="button"
                onClick={() => setTipo('liberacion')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${tipo === 'liberacion' ? 'bg-white dark:bg-neutral-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Liberar a Disponible
              </button>
            </div>
            {tipo === 'liberacion' && (
              <p className="text-xs text-gray-500 mt-2">
                El dinero volverá a estar disponible para ahorro o gastos de este mes.
              </p>
            )}
          </div>

          {/* Destino (si es reasignación) */}
          {tipo === 'reasignacion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Reserva Destino</label>
              <select
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500"
                value={destinoId}
                onChange={(e) => setDestinoId(Number(e.target.value))}
                required
              >
                <option value={0}>Seleccionar reserva...</option>
                {todasReservas.filter(r => r.id !== reserva.id).map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} (Saldo: {formatARS(r.saldo_actual)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Monto a mover</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <NumericFormat
                className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                thousandSeparator="."
                decimalSeparator=","
                value={monto || ''}
                onValueChange={(vals) => setMonto(vals.floatValue || 0)}
                placeholder="0"
                required
                max={reserva.saldo_actual}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || monto <= 0 || monto > reserva.saldo_actual}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
