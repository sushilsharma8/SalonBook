import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES } from '../../lib/categories';
import { Reveal, StaggerReveal, StaggerItem } from './Reveal';

export default function Categories() {
  return (
    <section className="py-20 md:py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">Categories</p>
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
              Every service, one platform
            </h2>
            <p className="text-stone-500 text-lg">
              From haircuts to spa days — explore salons across every beauty and wellness category.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-stone-900 font-semibold hover:gap-3 transition-all shrink-0"
          >
            View all salons
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>

        <StaggerReveal className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <StaggerItem key={cat.id}>
              <Link
                to={`/explore?category=${cat.id}`}
                className="group flex flex-col items-center gap-3 p-5 md:p-6 bg-white rounded-2xl border border-stone-200/60 hover:border-stone-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-colors duration-300">
                  <cat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900">{cat.label}</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
