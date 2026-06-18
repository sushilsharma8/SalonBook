import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useEffect, useState } from 'react';
import { ArrowRight, Star, MapPin, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

const headline = ['Book', 'beauty', '&', 'wellness', 'near', 'you'];

const FALLBACK_CARDS = [
  {
    name: 'Luxe Hair Studio',
    rating: '4.9',
    location: 'Bandra West',
    image: 'https://picsum.photos/seed/salon1/400/300',
    offset: 'top-24 -right-4 md:right-8',
    delay: 0.2,
  },
  {
    name: 'Glow Spa & Salon',
    rating: '4.8',
    location: 'Koramangala',
    image: 'https://picsum.photos/seed/salon2/400/300',
    offset: 'bottom-16 -left-4 md:left-8',
    delay: 0.4,
  },
];

interface SalonPreview {
  id: string;
  name: string;
  address: string;
  images: string | null;
}

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [floatingCards, setFloatingCards] = useState(FALLBACK_CARDS);

  useEffect(() => {
    fetch('/api/salons')
      .then(async (res) => {
        if (!res.ok) return;
        const data: SalonPreview[] = await res.json();
        const withImages = data.filter((s) => {
          if (!s.images) return false;
          try {
            const parsed = JSON.parse(s.images);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        });
        if (withImages.length < 2) return;
        const getImg = (s: SalonPreview) => {
          try {
            const parsed = JSON.parse(s.images!);
            return Array.isArray(parsed) ? parsed[0] : FALLBACK_CARDS[0].image;
          } catch {
            return FALLBACK_CARDS[0].image;
          }
        };
        setFloatingCards([
          { ...FALLBACK_CARDS[0], name: withImages[0].name, location: withImages[0].address.split(',')[0], image: getImg(withImages[0]) },
          { ...FALLBACK_CARDS[1], name: withImages[1].name, location: withImages[1].address.split(',')[0], image: getImg(withImages[1]) },
        ]);
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, prefersReducedMotion ? 1 : 0.3]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-stone-900 text-white"
    >
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-stone-200 mb-6"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              India&apos;s salon booking platform
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight font-display leading-[1.05] mb-6">
              {headline.map((word, i) => (
                <motion.span
                  key={word + i}
                  className="inline-block mr-[0.25em] last:mr-0"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.1 + i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word === 'beauty' || word === 'wellness' ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                      {word}
                    </span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="text-lg md:text-xl text-stone-300 max-w-xl mx-auto lg:mx-0 font-light mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              Discover top-rated salons, check real-time slots, and book hair, beauty, and wellness services in seconds. Pay at the shop — no hassle.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Link to="/explore">
                <Button variant="inverse" size="lg" className="rounded-full px-8 w-full sm:w-auto">
                  Explore salons
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-white/30 bg-white/10 text-white hover:bg-white/20 w-full sm:w-auto"
                >
                  List your salon
                </Button>
              </Link>
            </motion.div>

            <motion.div
              className="mt-10 flex flex-wrap justify-center lg:justify-start gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              {['Instant booking', 'Verified reviews', 'Real-time slots'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs md:text-sm font-semibold px-4 py-2 rounded-full bg-white/10 border border-white/15 text-stone-200"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Floating preview cards */}
          <div className="relative hidden lg:block h-[480px]">
            {floatingCards.map((card) => (
              <motion.div
                key={card.name}
                className={`absolute w-64 bg-white rounded-2xl overflow-hidden shadow-2xl border border-stone-200/60 ${card.offset}`}
                initial={{ opacity: 0, y: 60, rotate: card.offset.includes('left') ? -4 : 4 }}
                animate={{
                  opacity: 1,
                  y: prefersReducedMotion ? 0 : [0, -8, 0],
                  rotate: card.offset.includes('left') ? -3 : 3,
                }}
                transition={{
                  opacity: { duration: 0.7, delay: card.delay },
                  y: prefersReducedMotion
                    ? {}
                    : { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
                  rotate: { duration: 0.7, delay: card.delay },
                }}
              >
                <div className="h-36 overflow-hidden bg-stone-100">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-stone-900 font-display text-sm">{card.name}</h3>
                    <span className="flex items-center gap-1 text-xs font-bold text-stone-900">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {card.rating}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-stone-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {card.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-stone-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-stone-400 to-transparent"
          animate={prefersReducedMotion ? {} : { scaleY: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
}
