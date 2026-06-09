import { useCallback, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, QrCode, Share2 } from 'lucide-react';
import { Button } from './ui/Button';

type SalonQRCardProps = {
  salonId: string;
  salonName: string;
};

function getSalonUrl(salonId: string) {
  return `${window.location.origin}/salon/${salonId}`;
}

function getShareText(salonName: string) {
  return `Book an appointment at ${salonName} on SalonBook!`;
}

export function SalonQRCard({ salonId, salonName }: SalonQRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'error'>('idle');

  const salonUrl = useMemo(() => getSalonUrl(salonId), [salonId]);
  const shareText = useMemo(() => getShareText(salonName), [salonName]);

  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${salonName.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  }, [salonName]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(salonUrl);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [salonUrl]);

  const handleShare = useCallback(async () => {
    setShareStatus('sharing');

    try {
      const blob = await getCanvasBlob();
      const canShareFiles =
        typeof navigator.share === 'function' &&
        (!blob || typeof navigator.canShare !== 'function' || navigator.canShare({ files: [new File([blob], 'salon-qr.png', { type: 'image/png' })] }));

      if (canShareFiles && blob) {
        const file = new File([blob], 'salon-qr.png', { type: 'image/png' });
        await navigator.share({
          title: `${salonName} — SalonBook`,
          text: shareText,
          url: salonUrl,
          files: [file],
        });
        setShareStatus('idle');
        return;
      }

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `${salonName} — SalonBook`,
          text: shareText,
          url: salonUrl,
        });
        setShareStatus('idle');
        return;
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${salonUrl}`)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setShareStatus('idle');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareStatus('idle');
        return;
      }
      setShareStatus('error');
      window.setTimeout(() => setShareStatus('idle'), 2000);
    }
  }, [getCanvasBlob, salonName, salonUrl, shareText]);

  const copyLabel =
    copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy Link';

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60">
      <h2 className="text-2xl font-bold text-stone-900 flex items-center font-display tracking-tight mb-2">
        <QrCode className="w-6 h-6 mr-3 text-stone-900 shrink-0" />
        Share Your Salon
      </h2>
      <p className="text-sm text-stone-500 mb-6">
        Customers scan this QR to open your booking page directly.
      </p>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shrink-0">
          <QRCodeCanvas
            ref={canvasRef}
            value={salonUrl}
            size={160}
            level="M"
            includeMargin
            bgColor="#ffffff"
            fgColor="#1c1917"
          />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Booking link</p>
            <p
              className="text-sm text-stone-700 truncate font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
              title={salonUrl}
            >
              {salonUrl}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="primary"
              className="sm:flex-1 sm:min-w-[140px]"
              onClick={handleShare}
              disabled={shareStatus === 'sharing'}
            >
              <Share2 className="w-4 h-4" />
              {shareStatus === 'sharing' ? 'Sharing...' : shareStatus === 'error' ? 'Share failed — try again' : 'Share'}
            </Button>
            <Button variant="outline" className="sm:flex-1 sm:min-w-[140px]" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="secondary" className="sm:flex-1 sm:min-w-[140px]" onClick={handleCopyLink}>
              <Copy className="w-4 h-4" />
              {copyLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
