import { Search, CalendarCheck, Sparkles } from 'lucide-react';
import { Reveal, StaggerReveal, StaggerItem } from './Reveal';

const steps = [
  {
    step: '01',
    icon: Search,
    title: 'Search & discover',
    description: 'Browse salons by category, location, or rating. Filter by hair, nails, spa, barber, and more.',
  },
  {
    step: '02',
    icon: CalendarCheck,
    title: 'Pick a time slot',
    description: 'Select your services, choose a date, and see live available slots. Confirm your booking instantly.',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'Show up & relax',
    description: 'Get a confirmation, visit the salon, and pay at the shop. Leave a review after your visit.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
            Book in three simple steps
          </h2>
          <p className="text-stone-500 text-lg">
            No complicated forms. No waiting on hold. Just find, book, and go.
          </p>
        </Reveal>

        <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />

          {steps.map((item) => (
            <StaggerItem key={item.step} className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-900 text-white mb-6 relative z-10 mx-auto shadow-lg">
                <item.icon className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">
                Step {item.step}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-stone-900 font-display mb-3">{item.title}</h3>
              <p className="text-stone-500 leading-relaxed max-w-xs mx-auto">{item.description}</p>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
