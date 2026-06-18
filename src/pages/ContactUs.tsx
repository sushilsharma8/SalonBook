import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone, Headphones } from 'lucide-react';
import { Button } from '../components/ui/Button';

const SUPPORT_PHONE = '8283992627';
const SUPPORT_EMAIL = 'supportsalonbook@gmail.com';

const phoneDisplay = `+91 ${SUPPORT_PHONE.slice(0, 5)} ${SUPPORT_PHONE.slice(5)}`;
const telHref = `tel:+91${SUPPORT_PHONE}`;
const mailHref = `mailto:${SUPPORT_EMAIL}`;
const whatsappHref = `https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent('Hi SalonBook team, I need help with...')}`;

export default function ContactUs() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 md:py-16">
      <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-6">
          <Headphones className="w-6 h-6 text-stone-700" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2 font-display tracking-tight">Contact Us</h1>
        <p className="text-stone-500 mb-8 text-sm md:text-base">
          Have a question about bookings, your salon account, or need help with SalonBook? Reach out and we will get back to you as soon as we can.
        </p>

        <div className="space-y-4 mb-8">
          <a
            href={telHref}
            className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 group-hover:border-stone-300">
              <Phone className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mobile</p>
              <p className="text-stone-900 font-semibold">{phoneDisplay}</p>
            </div>
          </a>

          <a
            href={mailHref}
            className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 group-hover:border-stone-300">
              <Mail className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Email</p>
              <p className="text-stone-900 font-semibold break-all">{SUPPORT_EMAIL}</p>
            </div>
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="primary" size="lg" fullWidth className="flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat on WhatsApp
            </Button>
          </a>
          <a href={mailHref}>
            <Button type="button" variant="outline" size="lg" fullWidth className="flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" />
              Send Email
            </Button>
          </a>
        </div>

        <p className="text-center text-stone-500 text-sm mt-8">
          Looking to book a service? <Link to="/explore" className="text-stone-900 font-semibold hover:underline">Browse salons</Link>
        </p>
      </div>
    </div>
  );
}
