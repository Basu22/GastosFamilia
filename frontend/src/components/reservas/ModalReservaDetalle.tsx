import { useState } from 'react';
import { Wallet, X, Edit3 } from 'lucide-react';
import { formatARS } from '../../utils/format';
import { SaldoReserva } from '../../api/reservas';
import InlineEditForm from '../dashboard/InlineEditForm';

interface ModalReservaDetalleProps {
  reserva: SaldoReserva;
  movimientos: any[];
  mes: number;
  anio: number;
  onClose: () => void;
}

export default function ModalReservaDetalle({ reserva, movimientos, mes, anio, onClose }: ModalReservaDetalleProps) {
  const [editingItem, setEditingItem] = useState<{ id: number; tipo: 'tarjeta' | 'gasto' | 'ingreso' | 'prestamo' } | null>(null);

  // Filter movements for this reserve
  const detalles = movimientos.filter(m => {
    const esConsumo = m.reserva_nombre === reserva.nombre;
    const esFondeo = m.tipo === 'asignacion_reserva' && m.descripcion === `Fondeo: ${reserva.nombre}`;
    return esConsumo || esFondeo;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg glass-card border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div 
          className="p-6 flex items-center justify-between border-b border-white/10"
          style={{ backgroundColor: `${reserva.color}15` }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl shadow-lg"
              style={{ backgroundColor: `${reserva.color}30`, color: reserva.color || '#fff' }}
            >
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{reserva.nombre}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Detalle de movimientos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1 min-h-[100px]">
          {detalles.length > 0 ? (
            detalles.map((item, idx) => {
              const isFondeo = item.tipo === 'asignacion_reserva';
              const isEditing = editingItem?.id === item.id && editingItem?.tipo === item.tipo;

              return (
                <div key={idx} className="space-y-2">
                  <div 
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${
                      isEditing 
                        ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white leading-tight">{item.descripcion}</p>
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block"
                              style={{ 
                                backgroundColor: isFondeo ? '#10B98130' : '#EF444430',
                                color: isFondeo ? '#10B981' : '#EF4444'
                              }}>
                          {isFondeo ? 'Fondeo' : 'Consumo'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-[11px] font-bold tracking-tight animate-none"
                            style={{ color: isFondeo ? '#10B981' : '#FCA5A5' }}>
                        {isFondeo ? '+' : '-'}{formatARS(item.monto)}
                      </span>
                      {!isFondeo && (
                        <button 
                          onClick={() => setEditingItem(isEditing ? null : { id: item.id, tipo: item.tipo })}
                          className={`p-2 rounded-lg transition-all ${
                            isEditing 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                          style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="glass-card p-4 border-white/10 my-2 animate-in slide-in-from-top-4 duration-300">
                      <InlineEditForm 
                        id={item.id} 
                        tipo={item.tipo} 
                        mesActual={mes} 
                        anioActual={anio} 
                        onClose={() => setEditingItem(null)} 
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 opacity-50">
              <p className="text-[11px] text-gray-400">No hay movimientos registrados para este sobre este mes.</p>
            </div>
          )}
        </div>

        {/* Footer showing Asignado, Consumido and Accum. Balance */}
        <div className="p-6 border-t border-white/10 bg-black/20 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Asignado Mes</span>
              <span className="text-sm font-bold text-emerald-400">+{formatARS(reserva.asignacion_mes)}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Consumido Mes</span>
              <span className="text-sm font-bold text-red-400">-{formatARS(reserva.consumo_mes)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo Acumulado</span>
            <span className="text-2xl font-black text-white tracking-tighter" style={{ color: reserva.color }}>
              {formatARS(reserva.saldo_actual)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
