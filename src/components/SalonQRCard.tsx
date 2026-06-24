import { useCallback, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Loader2, Printer, QrCode, Scissors, Share2 } from 'lucide-react';
import { Button } from './ui/Button';
import { buildSalonUrl } from '../lib/utm';
import { trackEvent } from '../lib/analytics';
import {
  buildPosterHtml,
  openPosterPrint,
  parsePrimarySalonImage,
  resolveImageForPrint,
  salonInitial,
} from '../lib/salonPoster';

type SalonQRCardProps = {
  salonId: string;
  salonName: string;
  salonImages?: string | null;
};

function getShareText(salonName: string) {
  return `Book an appointment at ${salonName} on SalonBook!`;
}

function PosterPreview({
  salonName,
  photoUrl,
  salonUrl,
}: {
  salonName: string;
  photoUrl: string | null;
  salonUrl: string;
}) {
  const initial = salonInitial(salonName);

  return (
    <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 overflow-hidden shadow-md">
      {photoUrl ? (
        <div className="relative h-36 overflow-hidden bg-stone-800">
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/30 to-transparent" />
          <h3 className="absolute bottom-0 left-0 right-0 p-4 text-lg font-bold text-white font-display tracking-tight leading-tight">
            {salonName}
          </h3>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 px-6 py-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-xl font-bold font-display">
            {initial}
          </div>
          <h3 className="text-lg font-bold font-display tracking-tight">{salonName}</h3>
        </div>
      )}
      <div className="px-5 py-5 text-center bg-stone-50">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Walk-in booking</p>
        <p className="text-sm font-bold text-stone-900 font-display mb-4 leading-snug">
          Book your next visit in under a minute
        </p>
        <div className="inline-block rounded-2xl border-2 border-stone-200 bg-white p-3 shadow-sm">
          <QRCodeCanvas value={salonUrl} size={120} level="M" includeMargin bgColor="#ffffff" fgColor="#1c1917" />
        </div>
        <p className="mt-3 text-xs font-semibold text-stone-600">Scan with your phone camera</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {['1 · Scan', '2 · Pick slot', '3 · Visit us'].map((step) => (
            <span
              key={step}
              className="text-[10px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full"
            >
              {step}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-stone-500">Pay at the shop — no online payment required</p>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-stone-200 bg-white px-4 py-3">
        <Scissors className="w-4 h-4 text-stone-900" />
        <div className="text-left">
          <p className="text-xs font-bold text-stone-900 font-display">SalonBook</p>
          <p className="text-[10px] text-stone-400">India&apos;s salon booking platform</p>
        </div>
      </div>
    </div>
  );
}

export function SalonQRCard({ salonId, salonName, salonImages }: SalonQRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'error'>('idle');
  const [printError, setPrintError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const salonUrl = useMemo(() => buildSalonUrl(salonId), [salonId]);
  const shareText = useMemo(() => getShareText(salonName), [salonName]);
  const primaryImageUrl = useMemo(() => parsePrimarySalonImage(salonImages), [salonImages]);

  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, []);

  const getQrDataUrl = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl.length > 100 ? dataUrl : null;
    } catch {
      return null;
    }
  }, []);

  const handleDownload = useCallback(() => {
    const dataUrl = getQrDataUrl();
    if (!dataUrl) return;
    trackEvent('qr_download', { salon_id: salonId });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${salonName.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  }, [getQrDataUrl, salonId, salonName]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(salonUrl);
      trackEvent('qr_link_copy', { salon_id: salonId });
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [salonId, salonUrl]);

  const handleShare = useCallback(async () => {
    setShareStatus('sharing');
    trackEvent('qr_share', { salon_id: salonId });

    try {
      const blob = await getCanvasBlob();
      const canShareFiles =
        typeof navigator.share === 'function' &&
        (!blob ||
          typeof navigator.canShare !== 'function' ||
          navigator.canShare({ files: [new File([blob], 'salon-qr.png', { type: 'image/png' })] }));

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
  }, [getCanvasBlob, salonId, salonName, salonUrl, shareText]);

  const handlePrint = useCallback(async () => {
    setPrintError(null);
    setPrinting(true);
    trackEvent('qr_poster_print', { salon_id: salonId, has_photo: Boolean(primaryImageUrl) });

    try {
      const qrDataUrl = getQrDataUrl();
      if (!qrDataUrl) {
        setPrintError('QR code is not ready yet. Please try again.');
        return;
      }

      const photoSrc = primaryImageUrl ? await resolveImageForPrint(primaryImageUrl) : null;
      const html = buildPosterHtml(salonName, qrDataUrl, photoSrc);
      const opened = openPosterPrint(html);
      if (!opened) {
        setPrintError('Print preview could not open. Check browser settings.');
      }
    } finally {
      setPrinting(false);
    }
  }, [getQrDataUrl, salonId, salonName, primaryImageUrl]);

  const copyLabel =
    copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy link';

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60">
      <h2 className="text-2xl font-bold text-stone-900 flex items-center font-display tracking-tight mb-2">
        <QrCode className="w-6 h-6 mr-3 text-stone-900 shrink-0" />
        Share &amp; promote your salon
      </h2>
      <p className="text-sm text-stone-500 mb-6">
        Print the poster for your reception desk, or share your booking link online.
        {!primaryImageUrl && ' Add salon photos to show them on the poster.'}
      </p>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 items-start">
        <div className="mx-auto w-full max-w-[280px] lg:max-w-none lg:mx-0">
          <PosterPreview salonName={salonName} photoUrl={primaryImageUrl} salonUrl={salonUrl} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Booking link</p>
            <p
              className="text-sm text-stone-700 truncate font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
              title={salonUrl}
            >
              {salonUrl}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              onClick={handleShare}
              disabled={shareStatus === 'sharing'}
              className="col-span-2 sm:col-span-1"
            >
              <Share2 className="w-4 h-4" />
              {shareStatus === 'sharing' ? 'Sharing...' : shareStatus === 'error' ? 'Try again' : 'Share'}
            </Button>
            <Button variant="secondary" onClick={handleCopyLink} className="col-span-2 sm:col-span-1">
              <Copy className="w-4 h-4" />
              {copyLabel}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              QR image
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={printing}>
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printing ? 'Preparing...' : 'Print poster'}
            </Button>
          </div>

          {printError && (
            <p className="text-sm text-red-600" role="alert">
              {printError}
            </p>
          )}
        </div>
      </div>

      <div
        className="fixed -left-[9999px] top-0 h-[220px] w-[220px] overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <QRCodeCanvas
          ref={canvasRef}
          value={salonUrl}
          size={220}
          level="M"
          includeMargin
          bgColor="#ffffff"
          fgColor="#1c1917"
        />
      </div>
    </div>
  );
}
