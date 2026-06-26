import { useEffect, useState } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const DISMISS_KEY = 'salonbook:pwa-ios-banner-dismissed';

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
    if (localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
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
          <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white shadow-lg shadow-stone-900/10 p-4 flex gap-3 items-start">
            <img src="/pwa-192x192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 text-sm font-display">Install SalonBook</p>
              <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                Tap{' '}
                <Share className="inline w-3.5 h-3.5 align-text-bottom mx-0.5" aria-hidden />{' '}
                Share, then{' '}
                <PlusSquare className="inline w-3.5 h-3.5 align-text-bottom mx-0.5" aria-hidden />{' '}
                Add to Home Screen
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 p-1 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
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
