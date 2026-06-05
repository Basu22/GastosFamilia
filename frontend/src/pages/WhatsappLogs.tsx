import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Trash2, CheckCircle, XCircle, Clock, FileText, Camera, Mic } from 'lucide-react';
import { getWhatsappLogs, deleteWhatsappLog } from '../api/whatsapp_logs';

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
    <div id="page-whatsapp-logs" className="max-w-4xl mx-auto space-y-8 px-4 py-4 lg:px-8 lg:py-8 pb-24 relative min-h-screen">
      {/* Background Ambient Orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-aura-mint/5 blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-aura-lavender/5 blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-aura-mint/10 border border-aura-mint/20 rounded-xl shadow-lg shadow-aura-mint/5">
            <MessageCircle className="text-aura-mint w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Bot WhatsApp</h1>
            <p className="text-aura-mint/60 font-medium text-[10px] uppercase tracking-[0.2em] mt-1">Historial de mensajes y actividad de la IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-2xl border-white/5">
          <div className="w-2 h-2 bg-aura-mint rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Webhook Online</span>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 border-4 border-aura-mint/20 border-t-aura-mint rounded-full animate-spin shadow-[0_0_15px_rgba(45,212,191,0.2)]" />
          <p className="text-white/50 font-medium animate-pulse text-sm uppercase tracking-widest">Sincronizando actividad...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl border-dashed border-white/10">
          <p className="text-4xl mb-4 opacity-80">📱</p>
          <p className="text-white/80 font-bold mb-1">Todavía no llegaron mensajes al bot.</p>
          <p className="text-sm text-white/50">Manda un gasto por WhatsApp para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {logs.map((log: any) => {
            let datos = {};
            try { datos = log.datos_extraidos ? JSON.parse(log.datos_extraidos) : {}; } catch(e) {}
            
            return (
              <div key={log.id} className="group glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white/5 border-white/5 hover:border-aura-mint/20">
                <div className="flex items-center gap-5">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-inner">
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

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
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
