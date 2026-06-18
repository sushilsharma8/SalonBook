import { Link } from 'react-router-dom';
import { Store, Users, BarChart3, ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { Button } from '../ui/Button';

const benefits = [
  {
    icon: Store,
    title: 'List your salon free',
    description: 'Create your profile with photos, services, staff, and hours in minutes.',
  },
  {
    icon: Users,
    title: 'Reach new customers',
    description: 'Get discovered by people searching for salons in your area.',
  },
  {
    icon: BarChart3,
    title: 'Manage bookings',
    description: 'Confirm, complete, or cancel appointments from your seller dashboard.',
  },
];

export default function BusinessCta() {
  return (
    <section id="for-business" className="py-20 md:py-28 bg-stone-50 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">For salon owners</p>
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
              Grow your salon with SalonBook
            </h2>
            <p className="text-stone-500 text-lg mb-8 leading-relaxed">
              Join hundreds of salon owners who use SalonBook to fill their chairs, manage appointments, and build their reputation online.
            </p>
            <Link to="/register">
              <Button size="lg" className="rounded-full px-8">
                List your salon
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </Reveal>

          <div className="space-y-4">
            {benefits.map((benefit, i) => (
              <Reveal key={benefit.title} delay={i * 0.1}>
                <div className="flex gap-5 p-6 bg-white rounded-2xl border border-stone-200/60 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 font-display mb-1">{benefit.title}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
