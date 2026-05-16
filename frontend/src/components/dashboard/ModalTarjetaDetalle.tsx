
import { CreditCard, X } from 'lucide-react';
import { formatARS } from '../../utils/format';

interface DetalleItem {
  descripcion: string;
  monto: number;
  tipo: string;
}

interface TarjetaData {
  nombre: string;
  monto: number;
  color: string;
  detalle?: DetalleItem[];
}

interface ModalTarjetaDetalleProps {
  tarjeta: TarjetaData | null;
  onClose: () => void;
}

export default function ModalTarjetaDetalle({ tarjeta, onClose }: ModalTarjetaDetalleProps) {
  if (!tarjeta) return null;

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
          style={{ backgroundColor: `${tarjeta.color}15` }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl shadow-lg"
              style={{ backgroundColor: `${tarjeta.color}30`, color: tarjeta.color || '#fff' }}
            >
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{tarjeta.nombre}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Detalle de consumos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1 min-h-[100px]">
          {tarjeta.detalle && tarjeta.detalle.length > 0 ? (
            tarjeta.detalle.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
              >
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">{item.descripcion}</p>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block"
                        style={{ 
                          backgroundColor: item.tipo === 'cuota' ? '#C7D2FE30' : (item.tipo === 'fijo' ? '#FCD34D30' : '#A7F3D030'),
                          color: item.tipo === 'cuota' ? '#C7D2FE' : (item.tipo === 'fijo' ? '#FCD34D' : '#A7F3D0')
                        }}>
                    {item.tipo}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-white tracking-tight">
                  {formatARS(item.monto)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 opacity-50">
              <p className="text-[11px] text-gray-400">No hay detalles disponibles para esta tarjeta.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total a pagar</span>
          <span className="text-2xl font-black text-white tracking-tighter" style={{ color: tarjeta.color }}>
            {formatARS(tarjeta.monto)}
          </span>
        </div>
      </div>
    </div>
  );
}
