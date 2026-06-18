import { Calendar, Star, Clock, Wallet, Shield, Smartphone } from 'lucide-react';
import { Reveal, StaggerReveal, StaggerItem } from './Reveal';

const features = [
  {
    icon: Calendar,
    title: 'Instant booking',
    description: 'Pick your services, choose a slot, and confirm in under a minute. No phone calls needed.',
    className: 'md:col-span-2 md:row-span-2',
    accent: 'from-amber-500/10 to-amber-600/5',
  },
  {
    icon: Star,
    title: 'Verified reviews',
    description: 'Real ratings from customers who completed their visit.',
    className: 'md:col-span-1',
    accent: 'from-stone-500/10 to-stone-600/5',
  },
  {
    icon: Clock,
    title: 'Live availability',
    description: 'See open slots updated in real time for every salon.',
    className: 'md:col-span-1',
    accent: 'from-emerald-500/10 to-emerald-600/5',
  },
  {
    icon: Wallet,
    title: 'Pay at shop',
    description: 'No online payment gateway. Book now, pay when you arrive.',
    className: 'md:col-span-1',
    accent: 'from-amber-500/10 to-amber-600/5',
  },
  {
    icon: Shield,
    title: 'Trusted salons',
    description: 'Every salon is vetted with service listings, hours, and staff profiles.',
    className: 'md:col-span-1',
    accent: 'from-stone-500/10 to-stone-600/5',
  },
  {
    icon: Smartphone,
    title: 'Works everywhere',
    description: 'Book from your phone or desktop. Same seamless experience on every device.',
    className: 'md:col-span-2',
    accent: 'from-emerald-500/10 to-emerald-600/5',
  },
];

export default function Features() {
  return (
    <section className="py-20 md:py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">Why SalonBook</p>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
            Everything you need to book with confidence
          </h2>
          <p className="text-stone-500 text-lg">
            From discovery to confirmation, SalonBook makes salon booking effortless for customers and salon owners alike.
          </p>
        </Reveal>

        <StaggerReveal className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
          {features.map((feature) => (
            <StaggerItem
              key={feature.title}
              className={`group relative bg-white rounded-[1.5rem] md:rounded-[2rem] border border-stone-200/60 p-6 md:p-8 overflow-hidden hover:shadow-xl hover:border-stone-300/60 transition-all duration-500 ${feature.className}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-stone-700" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 font-display mb-2">{feature.title}</h3>
                <p className="text-stone-500 leading-relaxed">{feature.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
