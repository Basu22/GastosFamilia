import { useState } from 'react';
import { CheckCircle2, RefreshCw, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function LogAccordion({ title, logs }: { title: string; logs: any[] }) {
  const [open, setOpen] = useState(false);
  
  if (!logs || logs.length === 0) return null;
  const lastLog = logs[0]; // Assuming they are sorted by ID desc

  return (
    <div className="border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden mb-3 bg-gray-50 dark:bg-neutral-900/50">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {lastLog.accion === 'creado' && <CheckCircle2 className="text-emerald-500" size={20} />}
          {lastLog.accion === 'actualizado' && <RefreshCw className="text-blue-500" size={20} />}
          {lastLog.accion === 'sin_cambios' && <Info className="text-gray-400" size={20} />}
          {lastLog.accion === 'error' && <AlertCircle className="text-red-500" size={20} />}
          
          <div>
            <h4 className="font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
              {title}
              {lastLog.incluir_en_arca ? (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">ARCA</span>
              ) : null}
            </h4>
            <p className="text-xs text-gray-500">
              {new Date(lastLog.fecha).toLocaleString()} — Último: {lastLog.detalle}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className={`font-black ${lastLog.accion === 'error' ? 'text-gray-400' : 'text-gray-900 dark:text-neutral-100'}`}>
              ${lastLog.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </p>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
              MES {lastLog.mes}/{lastLog.anio}
            </p>
          </div>
          {open ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </div>
      
      {open && logs.length > 1 && (
        <div className="bg-white dark:bg-neutral-950 p-4 border-t border-gray-100 dark:border-neutral-800 space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Historial anterior</p>
          {logs.slice(1).map((log, idx) => (
            <div key={idx} className="flex justify-between items-center opacity-80 pl-8 border-l-2 border-gray-100 dark:border-neutral-800">
              <div>
                <p className="text-xs text-gray-900 dark:text-neutral-300">
                  <span className="font-bold">{new Date(log.fecha).toLocaleString()}</span> — {log.detalle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900 dark:text-neutral-300">
                  ${log.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
