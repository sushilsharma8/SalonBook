import { Marquee } from './Marquee';
import { Scissors, Sparkles, Star, Clock, MapPin } from 'lucide-react';

const trustItems = [
  { icon: Scissors, label: 'Hair Salons' },
  { icon: Sparkles, label: 'Beauty Studios' },
  { icon: Star, label: 'Top Rated' },
  { icon: Clock, label: 'Real-time Slots' },
  { icon: MapPin, label: 'Near You' },
  { icon: Scissors, label: 'Barber Shops' },
  { icon: Sparkles, label: 'Nail Studios' },
  { icon: Star, label: 'Verified Reviews' },
];

export default function TrustMarquee() {
  return (
    <section className="py-10 bg-white border-y border-stone-200/60 overflow-hidden">
      <Marquee speed={40}>
        {trustItems.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-stone-50 border border-stone-200/60 shrink-0"
          >
            <item.icon className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-semibold text-stone-700 whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
