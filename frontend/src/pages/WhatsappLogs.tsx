import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Trash2, CheckCircle, XCircle, Clock, FileText, Camera, Mic, Info } from 'lucide-react';
import { getWhatsappLogs, deleteWhatsappLog } from '../api/whatsapp_logs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function WhatsappLogs() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['whatsapp_logs'],
    queryFn: getWhatsappLogs,
    refetchInterval: 5000 // Refrescar cada 5 segundos para ver mensajes nuevos
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWhatsappLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp_logs'] })
  });

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'texto': return <FileText className="text-blue-400" size={20} />;
      case 'image': return <Camera className="text-purple-400" size={20} />;
      case 'audio':
      case 'voice': return <Mic className="text-emerald-400" size={20} />;
      case 'pdf':
      case 'document': return <FileText className="text-amber-400" size={20} />;
      default: return <MessageCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle size={12} /> Confirmado</span>;
      case 'cancelado':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><XCircle size={12} /> Cancelado</span>;
      default:
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
            <MessageCircle className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Bot WhatsApp</h1>
            <p className="text-gray-400 text-sm">Historial de mensajes y actividad de la IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1E293B]/40 border border-[#334155]/30 px-4 py-2 rounded-2xl">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Webhook Online</span>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Cargando actividad...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-[#1E293B]/20 rounded-3xl border border-dashed border-[#334155]/50">
          <p className="text-4xl mb-4">📱</p>
          <p className="text-gray-400 font-medium">Todavía no llegaron mensajes al bot.</p>
          <p className="text-sm text-gray-500">Manda un gasto por WhatsApp para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {logs.map((log: any) => {
            let datos = {};
            try { datos = log.datos_extraidos ? JSON.parse(log.datos_extraidos) : {}; } catch(e) {}
            
            return (
              <div key={log.id} className="group bg-[#1E293B]/40 backdrop-blur-md border border-[#334155]/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-[#1E293B]/60 shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="bg-[#0F172A] border border-[#334155]/50 p-4 rounded-2xl shadow-inner">
                    {getIcon(log.tipo_mensaje)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold tracking-wide">****{log.telefono.slice(-4)}</span>
                      {getStatusBadge(log.estado)}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-1 italic">"{log.mensaje_recibido}"</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                      {new Date(log.creado_en).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-[#334155]/20 pt-4 md:pt-0">
                  <div className="text-right space-y-1">
                    {log.datos_extraidos && (
                      <div className="flex flex-col items-end">
                        <span className="text-blue-400 font-bold text-lg leading-tight">{(datos as any).descripcion || '---'}</span>
                        <span className="text-emerald-400 font-mono text-xs">{(datos as any).monto ? `$${(datos as any).monto}` : ''}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(log.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-xl border border-red-500/20 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                    title="Eliminar log"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
