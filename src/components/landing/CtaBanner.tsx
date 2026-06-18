import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { Button } from '../ui/Button';

export default function CtaBanner() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-stone-800 to-stone-950 text-white px-8 py-16 md:px-16 md:py-20 text-center">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight mb-4">
                Ready to book your next visit?
              </h2>
              <p className="text-stone-300 text-lg mb-8 leading-relaxed">
                Join thousands of customers who book smarter. Find top-rated salons near you and secure your slot in seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/explore">
                  <Button variant="inverse" size="lg" className="rounded-full px-8 w-full sm:w-auto">
                    Start exploring
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 border-white/30 bg-white/10 text-white hover:bg-white/20 w-full sm:w-auto"
                  >
                    Create free account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
