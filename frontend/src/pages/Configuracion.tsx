import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Settings, Plus, CreditCard, Tag, Trash2, Edit3, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface MedioPago {
  id?: number;
  nombre: string;
  tipo: string;
  color: string;
}

interface Categoria {
  id?: number;
  nombre: string;
  icono: string;
  color: string;
}

export default function Configuracion() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'medios' | 'categorias'>('medios');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Efectivo');
  const [color, setColor] = useState('#3B82F6');
  const [icono, setIcono] = useState('Tag');

  const { data: medios } = useQuery({ queryKey: ['medios-pago'], queryFn: () => axios.get(`${API_URL}/configuracion/medios-pago`).then(res => res.data) });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: () => axios.get(`${API_URL}/configuracion/categorias`).then(res => res.data) });

  const mutationMedio = useMutation({
    mutationFn: (data: MedioPago) => editingId ? axios.put(`${API_URL}/configuracion/medios-pago/${editingId}`, data) : axios.post(`${API_URL}/configuracion/medios-pago`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['medios-pago'] }); resetForm(); }
  });

  const mutationCat = useMutation({
    mutationFn: (data: Categoria) => editingId ? axios.put(`${API_URL}/configuracion/categorias/${editingId}`, data) : axios.post(`${API_URL}/configuracion/categorias`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${API_URL}/configuracion/${activeTab === 'medios' ? 'medios-pago' : 'categorias'}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [activeTab === 'medios' ? 'medios-pago' : 'categorias'] }); }
  });

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setTipo('Efectivo');
    setColor('#3B82F6');
    setIcono('Tag');
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNombre(item.nombre);
    setColor(item.color);
    if (activeTab === 'medios') setTipo(item.tipo);
    else setIcono(item.icono);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'medios') mutationMedio.mutate({ nombre, tipo, color });
    else mutationCat.mutate({ nombre, icono, color });
  };

  return (
    <main className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between px-4 lg:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            <Settings className="text-blue-600" size={28} /> Configuración
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestioná tus medios de pago y categorías</p>
        </div>
      </header>

      <nav className="flex p-1 bg-gray-100 dark:bg-neutral-900 rounded-2xl mx-4 lg:mx-0">
        <button 
          onClick={() => { setActiveTab('medios'); resetForm(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'medios' ? 'bg-white dark:bg-black text-blue-600 shadow-sm' : 'text-gray-400'}`}
        >
          <CreditCard size={18} /> Medios de Pago
        </button>
        <button 
          onClick={() => { setActiveTab('categorias'); resetForm(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'categorias' ? 'bg-white dark:bg-black text-blue-600 shadow-sm' : 'text-gray-400'}`}
        >
          <Tag size={18} /> Categorías
        </button>
      </nav>

      <section className="bg-white dark:bg-neutral-950 p-6 rounded-3xl border border-gray-100 dark:border-neutral-900 shadow-sm mx-4 lg:mx-0">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          {editingId ? <Edit3 size={20} className="text-amber-500" /> : <Plus size={20} className="text-blue-500" />}
          {editingId ? 'Editar' : 'Nuevo'} {activeTab === 'medios' ? 'Medio de Pago' : 'Categoría'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</label>
              <input 
                value={nombre} onChange={e => setNombre(e.target.value)} required
                placeholder="Ej: Mercado Pago, Comida, etc."
                className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeTab === 'medios' ? 'Tipo' : 'Icono'}</label>
              {activeTab === 'medios' ? (
                <select 
                  value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 outline-none"
                >
                  <option value="Efectivo">Efectivo / Transferencia</option>
                  <option value="Tarjeta">Tarjeta de Crédito</option>
                  <option value="Debito">Tarjeta de Débito</option>
                </select>
              ) : (
                <input 
                  value={icono} onChange={e => setIcono(e.target.value)} required
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 outline-none"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color Distintivo</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
                />
                <span className="text-sm font-mono text-gray-500">{color}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancelar</button>
            )}
            <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save size={20} /> {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </section>

      <section className="px-4 lg:px-0 pb-10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Listado Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'medios' ? medios : categorias)?.map((item: any) => (
            <article key={item.id} className="group relative bg-white dark:bg-neutral-950 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-blue-200 transition-all shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: item.color }}>
                  {activeTab === 'medios' ? <CreditCard size={20} /> : <Tag size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-neutral-100">{item.nombre}</h4>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{activeTab === 'medios' ? item.tipo : item.icono}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"><Edit3 size={16} /></button>
                <button onClick={() => { if(window.confirm('¿Borrar?')) deleteMutation.mutate(item.id!); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
