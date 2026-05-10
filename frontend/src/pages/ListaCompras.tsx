import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Plus, CheckCircle, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getComprasDeseadas, createCompraDeseada, marcarComprada, deleteCompraDeseada } from '../api/compras_deseadas';
import { formatARS } from '../utils/format';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompraForm {
  descripcion: str;
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

  const { register, handleSubmit, reset, setValue, watch } = useForm<CompraForm>({
    defaultValues: { prioridad: 'media', categoria: 'otro' }
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
    navigate(`/movimientos?tab=egresos&desc=${encodeURIComponent(confirmModal.desc)}&monto=${confirmModal.monto || 0}`);
  };

  const pendientes = compras.filter((c: any) => c.estado === 'pendiente')
    .sort((a: any, b: any) => {
      const p: any = { alta: 3, media: 2, baja: 1 };
      return p[b.prioridad] - p[a.prioridad];
    });
  
  const comprados = compras.filter((c: any) => c.estado === 'comprado');

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center gap-4 mb-8">
        <div className="bg-blue-500/20 p-3 rounded-2xl border border-blue-500/30">
          <ShoppingCart className="text-blue-400 w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Lista de Compras</h1>
          <p className="text-gray-400 text-sm">Cosas que queremos o necesitamos comprar</p>
        </div>
      </header>

      {/* Formulario de Carga Rápida */}
      <section className="bg-[#1E293B]/40 backdrop-blur-xl border border-[#334155]/30 rounded-3xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} />
            <span>Agregar</span>
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
              <option value="otro">Otro</option>
              <option value="tecnologia">Tecnología</option>
              <option value="ropa">Ropa</option>
              <option value="hogar">Hogar</option>
              <option value="supermercado">Supermercado</option>
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
                "group relative bg-[#1E293B]/40 backdrop-blur-md border border-[#334155]/30 rounded-2xl p-5 flex items-center justify-between transition-all hover:bg-[#1E293B]/60",
                item.prioridad === 'alta' ? "border-l-4 border-l-red-500" : item.prioridad === 'media' ? "border-l-4 border-l-yellow-500" : "border-l-4 border-l-emerald-500"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-lg font-bold text-white">{item.descripcion}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F172A] border border-[#334155]/50 text-gray-400 uppercase tracking-widest">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-fade-in">
          <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="bg-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
              <ShoppingCart className="text-blue-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¿Lo compraste?</h2>
            <p className="text-gray-400 mb-8">Confirmá si ya compraste <span className="text-white font-bold">"{confirmModal.desc}"</span>. ¿Querés registrarlo como un gasto real?</p>
            
            <div className="space-y-3">
              <button
                onClick={handleRegisterAsExpense}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20"
              >
                Registrar como Gasto
              </button>
              <button
                onClick={() => markBoughtMutation.mutate(confirmModal.id)}
                className="w-full bg-[#334155]/50 hover:bg-[#334155] text-gray-200 font-bold py-4 rounded-2xl transition-all"
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
