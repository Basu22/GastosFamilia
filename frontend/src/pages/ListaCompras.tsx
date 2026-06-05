import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Plus, CheckCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getComprasDeseadas, createCompraDeseada, marcarComprada, deleteCompraDeseada } from '../api/compras_deseadas';
import { getCategorias } from '../api/configuracion';
import { formatARS } from '../utils/format';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompraForm {
  descripcion: string;
  precio_estimado?: number;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: string;
}

export default function ListaCompras() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showBought, setShowBought] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ id: number, desc: string, monto?: number } | null>(null);

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras_deseadas'],
    queryFn: () => getComprasDeseadas()
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<CompraForm>({
    defaultValues: { prioridad: 'media', categoria: 'Supermercado' }
  });

  const currentPrioridad = watch('prioridad');

  const createMutation = useMutation({
    mutationFn: createCompraDeseada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_deseadas'] });
      reset();
    }
  });

  const markBoughtMutation = useMutation({
    mutationFn: marcarComprada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_deseadas'] });
      setConfirmModal(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompraDeseada,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras_deseadas'] })
  });

  const onSubmit = (data: CompraForm) => {
    createMutation.mutate(data);
  };

  const handleRegisterAsExpense = () => {
    if (!confirmModal) return;
    markBoughtMutation.mutate(confirmModal.id);
    const compra = compras.find((c: any) => c.id === confirmModal.id);
    const catParam = compra?.categoria ? `&cat=${encodeURIComponent(compra.categoria)}` : '';
    navigate(`/movimientos?tab=egresos&desc=${encodeURIComponent(confirmModal.desc)}&monto=${confirmModal.monto || 0}${catParam}`);
  };

  const pendientes = compras.filter((c: any) => c.estado === 'pendiente')
    .sort((a: any, b: any) => {
      const p: any = { alta: 3, media: 2, baja: 1 };
      return p[b.prioridad] - p[a.prioridad];
    });
  
  const comprados = compras.filter((c: any) => c.estado === 'comprado');

  return (
    <div id="page-lista-compras" className="max-w-4xl mx-auto space-y-8 px-4 py-4 lg:px-8 lg:py-8 pb-24 relative min-h-screen">
      {/* Background Ambient Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-aura-gold/5 blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-aura-coral/5 blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <header className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-aura-gold/10 border border-aura-gold/20 rounded-xl shadow-lg shadow-aura-gold/5">
          <ShoppingCart className="text-aura-gold" size={28} />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Lista de Compras</h1>
          <p className="text-aura-gold/60 font-medium text-[10px] uppercase tracking-[0.2em] mt-1">Cosas que queremos o necesitamos comprar</p>
        </div>
      </header>

      {/* Formulario de Carga Rápida */}
      <section className="glass-card rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-aura-gold/5 blur-[80px] pointer-events-none rounded-full"></div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Descripción</label>
            <input
              {...register('descripcion', { required: true })}
              placeholder="¿Qué hay que comprar?"
              className="w-full bg-[#0F172A] border border-[#334155]/50 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Precio Est.</label>
            <input
              type="number"
              {...register('precio_estimado', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full bg-[#0F172A] border border-[#334155]/50 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full h-[58px] aura-btn-primary rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-aura-gold/10 disabled:opacity-50"
          >
            <Plus size={20} className="text-aura-bg" />
            <span className="text-aura-bg">Agregar</span>
          </button>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Prioridad</label>
            <div className="flex gap-2">
              {['baja', 'media', 'alta'].map((p: any) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue('prioridad', p)}
                  className={cn(
                    "flex-1 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-tighter",
                    currentPrioridad === p 
                      ? p === 'alta' ? "bg-red-500/20 border-red-500 text-red-400" : p === 'media' ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-[#0F172A] border-[#334155]/50 text-gray-500 hover:bg-[#1E293B]"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Categoría</label>
            <select
              {...register('categoria')}
              className="w-full bg-[#0F172A] border border-[#334155]/50 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white appearance-none"
            >
              {categorias?.filter((c:any) => c.tipo === 'Gasto' || c.tipo === 'Ambos').map((c: any) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
              <option value="Otro">Otro</option>
            </select>
          </div>
        </form>
      </section>

      {/* Lista de Pendientes */}
      <section className="space-y-4">
        {pendientes.length === 0 && !isLoading ? (
          <div className="text-center py-20 bg-[#1E293B]/20 rounded-3xl border border-dashed border-[#334155]/50">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-400 font-medium">Tu lista de deseos está vacía.</p>
            <p className="text-sm text-gray-500">¡Agregá el primero arriba!</p>
          </div>
        ) : (
          pendientes.map((item: any) => (
            <div
              key={item.id}
              className={cn(
                "group relative glass-card rounded-2xl p-5 flex items-center justify-between transition-all hover:bg-white/5",
                item.prioridad === 'alta' ? "border-l-4 border-l-aura-coral border-y-white/5 border-r-white/5" : item.prioridad === 'media' ? "border-l-4 border-l-aura-gold border-y-white/5 border-r-white/5" : "border-l-4 border-l-aura-mint border-y-white/5 border-r-white/5"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-lg font-bold text-white">{item.descripcion}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
                    {item.categoria}
                  </span>
                </div>
                {item.precio_estimado && (
                  <p className="text-blue-400 font-mono text-sm">{formatARS(item.precio_estimado)}</p>
                )}
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setConfirmModal({ id: item.id, desc: item.descripcion, monto: item.precio_estimado })}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-3 rounded-xl border border-emerald-500/20 transition-all active:scale-90"
                  title="Marcar como comprado"
                >
                  <CheckCircle size={20} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-xl border border-red-500/20 transition-all active:scale-90"
                  title="Eliminar"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Sección Comprados */}
      {comprados.length > 0 && (
        <section className="mt-12">
          <button
            onClick={() => setShowBought(!showBought)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-4"
          >
            {showBought ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <span className="font-bold uppercase tracking-widest text-xs">Comprados recientemente ({comprados.length})</span>
          </button>

          {showBought && (
            <div className="space-y-3">
              {comprados.map((item: any) => (
                <div key={item.id} className="bg-[#1E293B]/20 border border-[#334155]/20 rounded-2xl p-4 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-4">
                    <CheckCircle size={20} className="text-emerald-500" />
                    <span className="text-gray-400 line-through decoration-gray-500">{item.descripcion}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                      {new Date(item.comprado_en).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal de Confirmación / Conversión */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-aura-bg/80 animate-fade-in">
          <div className="glass-card border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-aura-gold/10 blur-[60px] pointer-events-none rounded-full"></div>
            <div className="bg-aura-gold/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-aura-gold/30 relative z-10">
              <ShoppingCart className="text-aura-gold w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">¿Lo compraste?</h2>
            <p className="text-gray-400 mb-8">Confirmá si ya compraste <span className="text-white font-bold">"{confirmModal.desc}"</span>. ¿Querés registrarlo como un gasto real?</p>
            
            <div className="space-y-3 relative z-10">
              <button
                onClick={handleRegisterAsExpense}
                className="w-full aura-btn-primary rounded-2xl font-bold py-4 transition-all shadow-lg text-aura-bg"
              >
                Registrar como Gasto
              </button>
              <button
                onClick={() => markBoughtMutation.mutate(confirmModal.id)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold py-4 rounded-2xl transition-all"
              >
                Solo marcar como comprado
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full text-gray-500 font-bold py-2 mt-2 hover:text-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
