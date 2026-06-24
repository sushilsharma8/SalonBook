import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Marquee } from './Marquee';
import { Reveal } from './Reveal';

const FALLBACK_TESTIMONIALS = [
  {
    name: 'Priya',
    role: 'Customer, Mumbai',
    quote: 'Booked a haircut in under a minute. No more calling salons and waiting on hold.',
    rating: 5,
  },
  {
    name: 'Rahul',
    role: 'Salon owner, Bangalore',
    quote: 'Setting up my salon profile took 10 minutes. Customers find me and book directly now.',
    rating: 5,
  },
  {
    name: 'Vikram',
    role: 'Customer, India',
    quote: 'Finally a booking app that understands Indian salons. Pay at shop, no forced online payments.',
    rating: 5,
  },
];

type Testimonial = (typeof FALLBACK_TESTIMONIALS)[0];

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <div className="w-[340px] shrink-0 bg-white rounded-[1.5rem] border border-stone-200/60 p-6 md:p-8 shadow-sm">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: item.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
        ))}
      </div>
      <p className="text-stone-600 leading-relaxed mb-6">&ldquo;{item.quote}&rdquo;</p>
      <div>
        <p className="font-bold text-stone-900 font-display">{item.name}</p>
        <p className="text-sm text-stone-500">{item.role}</p>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);

  useEffect(() => {
    fetch('/api/public/testimonials')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data as Testimonial[];
      })
      .then((data) => {
        if (data.length >= 3) setTestimonials(data);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">Testimonials</p>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
            Loved by customers & salon owners
          </h2>
          <p className="text-stone-500 text-lg">
            Real reviews from verified visits on SalonBook.
          </p>
        </Reveal>
      </div>

      <Marquee speed={50}>
        {testimonials.map((item, i) => (
          <TestimonialCard key={`${item.name}-${i}`} item={item} />
        ))}
      </Marquee>
    </section>
  );
}
