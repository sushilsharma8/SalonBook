import { useEffect, useState } from 'react';
import { X, PlusSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isPwaInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosDevice() || isPwaInstalled()) return;
    setVisible(true);
  }, []);

  const dismiss = () => setVisible(false);

  const openShare = async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'SalonBook',
        text: 'Book beauty & wellness appointments',
        url: window.location.origin,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white shadow-lg shadow-stone-900/10 p-2 flex gap-1 items-start">
            <button
              type="button"
              onClick={openShare}
              className="flex-1 min-w-0 flex gap-3 items-start text-left p-2 rounded-xl active:bg-stone-50 transition-colors cursor-pointer"
            >
              <img src="/pwa-192x192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 text-sm font-display">Install SalonBook</p>
                <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                  Tap here to open Share, then choose{' '}
                  <PlusSquare className="inline w-3.5 h-3.5 align-text-bottom mx-0.5" aria-hidden />{' '}
                  Add to Home Screen
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 p-2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              aria-label="Dismiss install hint"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
