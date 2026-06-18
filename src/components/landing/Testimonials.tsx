import { Star } from 'lucide-react';
import { Marquee } from './Marquee';
import { Reveal } from './Reveal';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Customer, Mumbai',
    quote: 'Booked a haircut in 30 seconds. No more calling salons and waiting on hold. SalonBook is a game changer.',
    rating: 5,
  },
  {
    name: 'Rahul Mehta',
    role: 'Salon Owner, Bangalore',
    quote: 'My bookings went up 40% after listing on SalonBook. The dashboard makes managing appointments effortless.',
    rating: 5,
  },
  {
    name: 'Ananya Reddy',
    role: 'Customer, Hyderabad',
    quote: 'Love seeing real reviews and live slot availability. I always know exactly when I can get in.',
    rating: 5,
  },
  {
    name: 'Vikram Singh',
    role: 'Customer, Delhi',
    quote: 'Finally a booking app that understands Indian salons. Pay at shop, no forced online payments.',
    rating: 5,
  },
  {
    name: 'Sneha Patel',
    role: 'Salon Owner, Pune',
    quote: 'Setting up my salon profile took 10 minutes. Now customers find me and book directly.',
    rating: 5,
  },
];

function TestimonialCard({ item }: { item: (typeof testimonials)[0] }) {
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
  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">Testimonials</p>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
            Loved by customers & salon owners
          </h2>
          <p className="text-stone-500 text-lg">
            See why people across India trust SalonBook for their beauty and wellness bookings.
          </p>
        </Reveal>
      </div>

      <Marquee speed={50}>
        {testimonials.map((item) => (
          <TestimonialCard key={item.name} item={item} />
        ))}
      </Marquee>
    </section>
  );
}
