export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parsePrimarySalonImage(images: string | null | undefined): string | null {
  if (!images) return null;
  try {
    const parsed = JSON.parse(images);
    if (!Array.isArray(parsed)) return null;
    const first = parsed.find((item) => typeof item === 'string' && item.trim().length > 0);
    return first ?? null;
  } catch {
    return null;
  }
}

export function salonInitial(name: string): string {
  return (name.trim().charAt(0) || 'S').toUpperCase();
}

export async function resolveImageForPrint(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

function buildWaitScript(imageIds: string[]): string {
  const ids = imageIds.map((id) => `'${id}'`).join(', ');
  return `var ids = [${ids}];
    var pending = ids.length;
    var printed = false;
    function tryPrint() {
      if (printed) return;
      pending--;
      if (pending <= 0) {
        printed = true;
        window.focus();
        window.print();
      }
    }
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) { tryPrint(); return; }
      el.onload = tryPrint;
      el.onerror = tryPrint;
      if (el.complete) tryPrint();
    });`;
}

export function buildPosterHtml(salonName: string, qrDataUrl: string, photoSrc: string | null): string {
  const safeName = escapeHtml(salonName);
  const safeQr = escapeHtml(qrDataUrl);
  const initial = escapeHtml(salonInitial(salonName));
  const hasPhoto = Boolean(photoSrc);

  const headerBlock = hasPhoto
    ? `<div class="hero">
        <img id="photo" class="hero-img" src="${escapeHtml(photoSrc!)}" alt="" />
        <div class="hero-overlay"></div>
        <h1 class="hero-title">${safeName}</h1>
      </div>`
    : `<div class="header-no-photo">
        <div class="monogram">${initial}</div>
        <h1 class="title">${safeName}</h1>
        <div class="divider"></div>
      </div>`;

  const imageIds = hasPhoto ? ['photo', 'qr'] : ['qr'];

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${safeName} — SalonBook</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  @page { size: A5 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #f5f5f4;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 8mm;
  }
  .poster {
    width: 100%;
    max-width: 128mm;
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(28, 25, 23, 0.15);
  }
  .hero { position: relative; height: 72mm; overflow: hidden; background: #292524; }
  .hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.35) 45%, rgba(28,25,23,0.1) 100%);
  }
  .hero-title {
    position: absolute; left: 0; right: 0; bottom: 0; margin: 0;
    padding: 16px 20px 18px; font-size: 22px; font-weight: 700;
    letter-spacing: -0.02em; line-height: 1.2; color: #fafaf9; text-align: left;
  }
  .header-no-photo {
    padding: 28px 24px 20px; text-align: center;
    background: linear-gradient(160deg, #1c1917 0%, #292524 100%); color: #fafaf9;
  }
  .monogram {
    width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 16px;
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 700; letter-spacing: -0.03em;
  }
  .title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
  .divider { width: 40px; height: 3px; background: #fafaf9; border-radius: 999px; margin: 14px auto 0; opacity: 0.5; }
  .content { padding: 22px 24px 20px; text-align: center; }
  .eyebrow { margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #a8a29e; }
  .headline { margin: 0 0 18px; font-size: 17px; font-weight: 700; letter-spacing: -0.02em; color: #1c1917; line-height: 1.35; }
  .qr-wrap {
    display: inline-block; padding: 14px; background: #ffffff;
    border: 2px solid #e7e5e4; border-radius: 20px;
    box-shadow: 0 4px 14px rgba(28, 25, 23, 0.06); margin-bottom: 16px;
  }
  .qr { display: block; width: 42mm; height: 42mm; }
  .scan-label { margin: 0 0 14px; font-size: 13px; font-weight: 600; color: #44403c; }
  .steps { display: flex; justify-content: center; gap: 6px; margin: 0 0 16px; flex-wrap: wrap; }
  .step {
    font-size: 10px; font-weight: 600; color: #57534e;
    background: #f5f5f4; border: 1px solid #e7e5e4; padding: 5px 10px; border-radius: 999px;
  }
  .pay-note { margin: 0; font-size: 12px; color: #78716c; line-height: 1.5; }
  .footer {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px 20px 18px; border-top: 1px solid #e7e5e4; background: #ffffff;
  }
  .footer-brand { font-size: 13px; font-weight: 700; color: #1c1917; letter-spacing: -0.02em; }
  .footer-tag { font-size: 10px; color: #a8a29e; margin-top: 1px; }
</style>
</head><body>
  <article class="poster">
    ${headerBlock}
    <div class="content">
      <p class="eyebrow">Walk-in booking</p>
      <p class="headline">Book your next visit<br>in under a minute</p>
      <div class="qr-wrap">
        <img id="qr" class="qr" src="${safeQr}" alt="Booking QR code" />
      </div>
      <p class="scan-label">Scan with your phone camera</p>
      <div class="steps">
        <span class="step">1 · Scan</span>
        <span class="step">2 · Pick slot</span>
        <span class="step">3 · Visit us</span>
      </div>
      <p class="pay-note">Pay at the shop — no online payment required</p>
    </div>
    <footer class="footer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1917" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
        <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
        <line x1="8.12" y1="8.12" x2="12" y2="12"/>
      </svg>
      <div>
        <div class="footer-brand">SalonBook</div>
        <div class="footer-tag">India's salon booking platform</div>
      </div>
    </footer>
  </article>
  <script>${buildWaitScript(imageIds)}</script>
</body></html>`;
}

export function openPosterPrint(html: string): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print QR poster');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 500);
  };

  frameWindow.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 30_000);
  return true;
}
