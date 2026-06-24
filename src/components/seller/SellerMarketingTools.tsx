import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';

type SalonOnboardingData = {
  images?: string | null;
  services?: { id: string }[];
  staff?: { id: string; skills?: string | null }[];
  hours?: { dayOfWeek: number; isOpen: boolean }[];
};

function parseImageCount(images: string | null | undefined): number {
  if (!images) return 0;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i === 'string' && i.trim()).length : 0;
  } catch {
    return 0;
  }
}

function countRealStaff(staff: SalonOnboardingData['staff']): number {
  return (staff || []).filter((s) => s.skills !== 'SALON_DEFAULT_STAFF').length;
}

export function SellerOnboardingChecklist({ salon }: { salon: SalonOnboardingData | null }) {
  const steps = useMemo(() => {
    const photoCount = parseImageCount(salon?.images);
    const serviceCount = salon?.services?.length ?? 0;
    const staffCount = countRealStaff(salon?.staff);
    const hasHours = (salon?.hours?.length ?? 0) >= 7;

    return [
      { label: 'Add at least 3 salon photos', done: photoCount >= 3, detail: `${photoCount}/3 photos` },
      { label: 'Set weekly opening hours', done: hasHours, detail: hasHours ? 'Complete' : 'Incomplete' },
      { label: 'List at least 8 services with prices', done: serviceCount >= 8, detail: `${serviceCount}/8 services` },
      { label: 'Add staff members', done: staffCount >= 1, detail: `${staffCount} staff` },
    ];
  }, [salon]);

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  if (!salon) return null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">Launch checklist</h2>
          <p className="text-sm text-stone-500 mt-1">
            Complete these steps so customers can find and book you.
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
          allDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {completed}/{steps.length}
        </span>
      </div>
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 text-sm">
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-stone-300 shrink-0" />
            )}
            <span className={step.done ? 'text-stone-600' : 'text-stone-900 font-medium'}>{step.label}</span>
            <span className="ml-auto text-stone-400 text-xs">{step.detail}</span>
          </li>
        ))}
      </ul>
      {allDone && (
        <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          Profile ready — print your poster below and place it at your reception.
        </p>
      )}
    </div>
  );
}

export function SellerMarketingKit() {
  return (
    <div className="bg-stone-50 p-6 md:p-8 rounded-[2rem] border border-stone-200/60">
      <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight mb-2">Grow your bookings</h2>
      <p className="text-sm text-stone-500 mb-6">Use these playbooks to bring customers from your shop and social media.</p>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <h3 className="font-semibold text-stone-900 mb-2">In-shop QR</h3>
          <p className="text-sm text-stone-500 mb-3">Print the QR poster and place it at reception. Staff line: &ldquo;Scan to book your next visit — skip the call.&rdquo;</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <h3 className="font-semibold text-stone-900 mb-2">Instagram &amp; WhatsApp</h3>
          <p className="text-sm text-stone-500 mb-3">Add your booking link to your Instagram bio. Share the link in status when you have last-minute slots open.</p>
          <p className="text-xs text-stone-400 font-mono bg-stone-50 rounded-lg px-3 py-2">Book your next appointment on SalonBook — pay at the shop!</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
          <h3 className="font-semibold text-stone-900 mb-2">Reels idea (15 sec)</h3>
          <p className="text-sm text-stone-500">Screen record: search your salon → pick a slot → confirm. Caption: &ldquo;No more waiting on hold — book in 60 seconds.&rdquo;</p>
        </div>
      </div>
      <p className="text-xs text-stone-400 mt-4">
        Need help onboarding?{' '}
        <Link to="/contact" className="text-stone-700 underline hover:text-stone-900">Contact SalonBook support</Link>
      </p>
    </div>
  );
}
