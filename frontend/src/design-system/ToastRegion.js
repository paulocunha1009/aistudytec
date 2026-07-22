import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const styles = {
  error: { box: 'border-red-200 bg-red-50 text-red-900', Icon: XCircle, label: 'Erro' },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icon: CheckCircle2, label: 'Sucesso' },
  info: { box: 'border-blue-200 bg-blue-50 text-blue-900', Icon: Info, label: 'Informação' },
};

const ToastRegion = ({ toasts, onDismiss }) => (
  <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-sm" aria-label="Notificações">
    {toasts.map((toast) => {
      const config = styles[toast.type] || styles.info;
      const Icon = config.Icon;
      return (
        <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl ${config.box}`}>
          <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1"><span className="sr-only">{config.label}: </span><p className="text-sm font-medium">{String(toast.message || 'Evento')}</p></div>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Fechar notificação" className="rounded-lg p-1 hover:bg-black/5"><X size={16} /></button>
        </div>
      );
    })}
  </div>
);

export default ToastRegion;
