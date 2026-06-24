import { CheckCircle, X, XCircle, Info } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-white text-stone-800 border-stone-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-5 h-5 shrink-0" />
          ) : (
            <Info className="w-5 h-5 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
