import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { Reveal } from './Reveal';

interface PublicStats {
  salons: number;
  services: number;
  reviews: number;
  cities: number;
}

const FALLBACK_STATS: PublicStats = {
  salons: 0,
  services: 0,
  reviews: 0,
  cities: 1,
};

function useCountUp(target: number, duration = 2000, enabled = true) {
  const [count, setCount] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled) return;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration, enabled, prefersReducedMotion]);

  return count;
}

function StatCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count = useCountUp(value, 2000, inView);

  return (
    <motion.div
      ref={ref}
      className="bg-white rounded-[1.5rem] border border-stone-200/60 p-6 md:p-8 text-center hover:shadow-lg transition-shadow duration-300"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-4xl md:text-5xl font-bold text-stone-900 font-display tracking-tight">
        {count.toLocaleString('en-IN')}
        {suffix}
      </p>
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500 mt-2">{label}</p>
    </motion.div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState<PublicStats>(FALLBACK_STATS);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data as PublicStats;
      })
      .then((data) => {
        setStats({
          salons: data.salons,
          services: data.services,
          reviews: data.reviews,
          cities: Math.max(data.cities, 1),
        });
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const showSuffix = (n: number) => (n > 0 ? '+' : '');

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-stone-800 to-stone-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-3">By the numbers</p>
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight mb-4">
            Growing across India
          </h2>
          <p className="text-stone-400 text-lg">
            Join thousands of customers and salon owners already using SalonBook.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Active salons" value={stats.salons} suffix={showSuffix(stats.salons)} />
          <StatCard label="Services listed" value={stats.services} suffix={showSuffix(stats.services)} />
          <StatCard label="Customer reviews" value={stats.reviews} suffix={showSuffix(stats.reviews)} />
          <StatCard label="Cities covered" value={stats.cities} suffix={showSuffix(stats.cities)} />
        </div>
      </div>
    </section>
  );
}
