import { useState } from 'react';
import { CreditCard, X, Edit3, ShieldAlert, Plus } from 'lucide-react';
import { formatARS } from '../../utils/format';
import InlineEditForm from './InlineEditForm';
import InlineCreateForm from './InlineCreateForm';

interface DetalleItem {
  id: number;
  edit_tipo: 'tarjeta' | 'gasto' | 'ingreso' | 'prestamo';
  descripcion: string;
  monto: number;
  tipo: string;
  tarjeta_nombre?: string;
  tarjeta_color?: string;
}

interface DetailGroup {
  key: string;
  label: string;
  items: DetalleItem[];
}

export interface GenericDetailData {
  type: 'tarjeta' | 'movimiento';
  name: string;
  color: string;
  monto: number;
  tarjeta_id?: number;
  groups?: DetailGroup[];
  items?: DetalleItem[];
}

interface ModalTarjetaDetalleProps {
  detailData: GenericDetailData | null;
  mesActual: number;
  anioActual: number;
  activeName?: 'cuota' | 'fijo' | 'variable' | 'efectivo' | 'ingreso';
  onClose: () => void;
}

export default function ModalTarjetaDetalle({ detailData, mesActual, anioActual, activeName, onClose }: ModalTarjetaDetalleProps) {
  const [editingItem, setEditingItem] = useState<{ id: number; tipo: 'tarjeta' | 'gasto' | 'ingreso' | 'prestamo' } | null>(null);
  const [creandoEnSeccion, setCreandoEnSeccion] = useState<string | null>(null);

  if (!detailData) return null;

  const renderMovementItem = (item: DetalleItem) => {
    const isEditing = editingItem?.id === item.id && editingItem?.tipo === item.edit_tipo;
    const match = item.descripcion.match(/\s*\((\d+)\/(\d+)\)$/);
    const displayDescripcion = match ? item.descripcion.replace(/\s*\((\d+)\/(\d+)\)$/, '') : item.descripcion;
    const cuotaInfo = match ? `CUOTA ${match[1]}/${match[2]}` : null;

    return (
      <div key={`${item.edit_tipo}-${item.id}`} className="space-y-2">
        <div 
          className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${
            isEditing 
              ? 'bg-aura-lavender/10 border-aura-lavender/30 shadow-[0_0_15px_rgba(199,210,254,0.1)]' 
              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div 
              className="w-1.5 h-8 rounded-full shrink-0" 
              style={{ backgroundColor: item.tarjeta_color || detailData.color }} 
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-snug">
                {displayDescripcion}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Badge de tipo de gasto */}
                <span 
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block shrink-0"
                  style={{ 
                    backgroundColor: item.tipo === 'cuota' ? '#C7D2FE30' : (item.tipo === 'fijo' ? '#FCD34D30' : '#A7F3D030'),
                    color: item.tipo === 'cuota' ? '#C7D2FE' : (item.tipo === 'fijo' ? '#FCD34D' : '#A7F3D0')
                  }}
                >
                  {item.tipo === 'cuota' ? 'CUOTAS' : item.tipo}
                </span>

                {/* Info de cuotas al lado del badge */}
                {cuotaInfo && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 shrink-0 ml-1">
                    {cuotaInfo}
                  </span>
                )}
                
                {/* Badge de Tarjeta (solo si se visualiza por Movimiento) */}
                {detailData.type === 'movimiento' && item.tarjeta_nombre && (
                  <span 
                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block border shrink-0 text-white/70"
                    style={{ 
                      borderColor: `${item.tarjeta_color}40`,
                      backgroundColor: `${item.tarjeta_color}15`
                    }}
                  >
                    💳 {item.tarjeta_nombre}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <span className="text-sm font-bold text-white tracking-tight">
              {formatARS(item.monto)}
            </span>
            <button 
              onClick={() => setEditingItem(isEditing ? null : { id: item.id, tipo: item.edit_tipo })}
              className={`p-2 rounded-lg transition-all ${
                isEditing 
                  ? 'bg-aura-lavender text-aura-bg shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Edit3 size={16} />
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="glass-card p-6 border-aura-lavender/30 my-2 animate-in slide-in-from-top-4 duration-300">
            <InlineEditForm 
              id={item.id} 
              tipo={item.edit_tipo} 
              mesActual={mesActual} 
              anioActual={anioActual} 
              onClose={() => setEditingItem(null)} 
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-xl lg:max-w-none lg:w-[50vw] lg:h-auto glass-card border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[70vh]"
      >
        {/* Header del Modal */}
        <div 
          className="p-6 flex items-center justify-between border-b border-white/10"
          style={{ backgroundColor: `${detailData.color}10` }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-2xl shadow-lg border"
              style={{ 
                backgroundColor: `${detailData.color}15`, 
                borderColor: `${detailData.color}35`,
                color: detailData.color || '#fff' 
              }}
            >
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{detailData.name}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                {detailData.type === 'tarjeta' ? 'Detalle por Tarjeta de Crédito' : 'Detalle por Tipo de Movimiento'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-[150px]">
          {detailData.type === 'tarjeta' && detailData.groups ? (
            detailData.groups.map(group => {
              const showPlus = ['cuotas', 'fijos', 'variables'].includes(group.key);
              const showCreate = creandoEnSeccion === group.key;
              const formTipo = group.key === 'cuotas' ? 'tarjeta' : (group.key === 'fijos' ? 'gasto_fijo' : 'gasto_variado');
              
              return (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between px-2 pb-1 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.label}</h4>
                      {showPlus && (
                        <button 
                          onClick={() => setCreandoEnSeccion(showCreate ? null : group.key)}
                          className={`p-1.5 rounded-lg transition-all duration-300 ${
                            showCreate 
                              ? 'bg-aura-coral text-aura-bg rotate-45' 
                              : 'bg-aura-lavender text-aura-bg hover:scale-110 shadow-md'
                          }`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={10} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white/90">
                      {formatARS(group.items.reduce((acc, m) => acc + m.monto, 0))}
                    </span>
                  </div>

                  {showCreate && (
                    <div className="glass-card p-4 border-aura-border/30">
                      <InlineCreateForm 
                        tipo={formTipo as any} 
                        mes={mesActual} 
                        anio={anioActual} 
                        onClose={() => setCreandoEnSeccion(null)}
                        defaultMedioPago={detailData.tarjeta_id ? `tarjeta_${detailData.tarjeta_id}` : ''}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {group.items.map(renderMovementItem)}
                  </div>
                </div>
              );
            })
          ) : detailData.items && detailData.items.length > 0 ? (
            <div className="space-y-4">
              {/* Botón superior de creación rápida */}
              {(() => {
                const showCreate = creandoEnSeccion === 'nuevo';
                let formTipo: any = null;
                if (activeName === 'cuota') formTipo = 'tarjeta';
                else if (activeName === 'fijo') formTipo = 'gasto_fijo';
                else if (activeName === 'variable') formTipo = 'gasto_variado';
                else if (activeName === 'ingreso') formTipo = 'ingreso';
                else if (activeName === 'efectivo') formTipo = 'gasto_variado';

                if (!formTipo) return null;

                return (
                  <div className="space-y-3 border-b border-white/5 pb-4">
                    <div className="flex justify-end px-2">
                      <button 
                        onClick={() => setCreandoEnSeccion(showCreate ? null : 'nuevo')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all shadow-md ${
                          showCreate 
                            ? 'bg-aura-coral text-aura-bg rotate-0' 
                            : 'bg-aura-lavender text-aura-bg hover:scale-105 active:scale-95'
                        }`}
                      >
                        <Plus size={12} strokeWidth={3} className={`transition-transform duration-350 ${showCreate ? 'rotate-45' : ''}`} />
                        {showCreate ? 'Cerrar' : `Agregar ${activeName === 'ingreso' ? 'Ingreso' : 'Egreso'}`}
                      </button>
                    </div>

                    {showCreate && (
                      <div className="glass-card p-4 border-aura-border/30">
                        <InlineCreateForm 
                          tipo={formTipo} 
                          mes={mesActual} 
                          anio={anioActual} 
                          onClose={() => setCreandoEnSeccion(null)}
                          defaultMedioPago=""
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {detailData.items.map(renderMovementItem)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <ShieldAlert className="mx-auto mb-3 opacity-40 text-gray-400" size={36} />
              <p className="font-semibold text-gray-500">Sin movimientos</p>
              <p className="text-xs mt-1">No hay detalles disponibles para este filtro.</p>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-6 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total a pagar</span>
          <span className="text-2xl font-black tracking-tighter" style={{ color: detailData.color }}>
            {formatARS(detailData.monto)}
          </span>
        </div>
      </div>
    </div>
  );
}
