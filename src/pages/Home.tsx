import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, MapPin, Clock, Search, ArrowRight, AlertTriangle, Circle } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import { isSalonOpenNow, normalizeWeeklyHoursFromApi, type SalonDayHours } from '../lib/salonHours';

interface Salon {
  id: string;
  name: string;
  address: string;
  images: string | null;
  categories: string | null;
  openTime: string;
  closeTime: string;
  hours?: SalonDayHours[];
  serviceCount: number;
  reviewCount: number;
  avgRating: number | null;
}

export default function Home() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && CATEGORIES.some((c) => c.id === categoryParam)) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setFetchError(null);
    fetch('/api/salons')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        return data;
      })
      .then(data => {
        setSalons(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load salons');
        setLoading(false);
      });
  }, []);

  const filteredSalons = useMemo(() => {
    return salons.filter(salon => {
      const matchesSearch = 
        salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCategory = true;
      if (selectedCategory) {
        try {
          const parsed = salon.categories ? JSON.parse(salon.categories) : {};
          const primary = parsed.primary || '';
          const related = parsed.related || [];
          matchesCategory = primary === selectedCategory || related.includes(selectedCategory);
        } catch (e) {
          matchesCategory = false;
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [salons, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-64 rounded-[2rem] bg-stone-200/60 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-[1.5rem] bg-stone-200/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] border border-red-100 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-xl font-medium text-stone-900 mb-2">Could not load salons</p>
        <p className="text-stone-500 mb-6">{fetchError}</p>
        <button
          onClick={() => { setLoading(true); window.location.reload(); }}
          className="px-6 py-2.5 bg-stone-900 text-white rounded-full font-bold hover:bg-stone-800 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-6 py-10 md:py-20 bg-stone-900 text-white rounded-[1.5rem] md:rounded-[2rem] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/salon-bg/1920/1080?blur=4')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight font-display mb-4 md:mb-6 leading-tight">
            Find the perfect salon near you
          </h1>
          <p className="text-sm md:text-xl text-stone-300 max-w-2xl mx-auto font-light mb-8 md:mb-10">
            Book hair, beauty, and wellness services instantly with the best professionals in your area.
          </p>
          
          <div className="relative max-w-xl mx-auto mt-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-stone-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 rounded-2xl border-0 ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-white bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 text-base md:text-lg outline-none transition-all"
              placeholder="Search by salon name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['Instant booking', 'Verified reviews', 'Top-rated salons'].map((tag) => (
              <span key={tag} className="text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-stone-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-3 snap-x">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`snap-start shrink-0 px-6 py-3 rounded-full text-sm font-bold transition-all border ${
            selectedCategory === null 
              ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`snap-start shrink-0 px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center space-x-2 border ${
              selectedCategory === cat.id 
                ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-stone-200/60 rounded-xl sm:rounded-2xl px-2.5 py-3 sm:px-5 sm:py-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-stone-500 font-bold leading-tight">Active salons</p>
          <p className="text-lg sm:text-2xl font-display font-bold text-stone-900 mt-0.5 sm:mt-1">{salons.length}</p>
        </div>
        <div className="bg-white border border-stone-200/60 rounded-xl sm:rounded-2xl px-2.5 py-3 sm:px-5 sm:py-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-stone-500 font-bold leading-tight">Total services</p>
          <p className="text-lg sm:text-2xl font-display font-bold text-stone-900 mt-0.5 sm:mt-1">{salons.reduce((acc, salon) => acc + salon.serviceCount, 0)}</p>
        </div>
        <div className="bg-white border border-stone-200/60 rounded-xl sm:rounded-2xl px-2.5 py-3 sm:px-5 sm:py-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-stone-500 font-bold leading-tight">
            <span className="sm:hidden">Reviewed</span>
            <span className="hidden sm:inline">Reviewed salons</span>
          </p>
          <p className="text-lg sm:text-2xl font-display font-bold text-stone-900 mt-0.5 sm:mt-1">{salons.filter((s) => s.reviewCount > 0).length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 mt-4">
        <h2 className="text-2xl md:text-3xl font-bold text-stone-900 font-display tracking-tight">
          {selectedCategory ? `${CATEGORIES.find(c => c.id === selectedCategory)?.label} Salons` : 'Featured Salons'}
        </h2>
        <span className="text-stone-500 font-medium">{filteredSalons.length} results</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSalons.map(salon => {
          let images = ['https://picsum.photos/seed/salon/400/300'];
          if (salon.images) {
            try {
              const parsed = JSON.parse(salon.images);
              if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
            } catch {
              /* use fallback image */
            }
          }
          const hasRating = salon.avgRating != null;
          const weeklyHours = normalizeWeeklyHoursFromApi(salon.hours, salon.openTime, salon.closeTime);
          const openNow = isSalonOpenNow(weeklyHours, salon.openTime, salon.closeTime);

          return (
            <Link 
              key={salon.id} 
              to={`/salon/${salon.id}`}
              className="group bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200/60 flex flex-col"
            >
              <div className="relative h-56 overflow-hidden bg-stone-100">
                <img 
                  src={images[0]} 
                  alt={salon.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none" />

                <div
                  className={`absolute top-3 left-3 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide backdrop-blur-md shadow-sm border ${
                    openNow
                      ? 'bg-emerald-950/55 text-emerald-50 border-emerald-400/30'
                      : 'bg-stone-950/55 text-stone-100 border-stone-400/25'
                  }`}
                >
                  <Circle
                    className={`w-2 h-2 shrink-0 fill-current ${
                      openNow ? 'text-emerald-400' : 'text-stone-400'
                    }`}
                  />
                  {openNow ? 'Open now' : 'Closed'}
                </div>

                {hasRating ? (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm border bg-white/95 text-stone-900 border-white/60">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>{salon.avgRating!.toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide backdrop-blur-md shadow-sm border bg-white/92 text-stone-700 border-white/50">
                    <Circle className="w-2 h-2 shrink-0 fill-violet-400 text-violet-400" />
                    New
                  </div>
                )}
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl md:text-2xl font-bold text-stone-900 mb-3 font-display tracking-tight">{salon.name}</h3>
                
                <div className="space-y-3 text-sm text-stone-500 mb-6 flex-1">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                    <span className="line-clamp-2 leading-relaxed">{salon.address}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 shrink-0 text-stone-400" />
                    <span>{salon.openTime} - {salon.closeTime}</span>
                  </div>
                </div>
                
                <div className="pt-5 border-t border-stone-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-600 bg-stone-100 px-4 py-1.5 rounded-full">
                    {salon.serviceCount} services
                  </span>
                  <span className="text-stone-900 font-semibold group-hover:translate-x-1 transition-transform flex items-center">
                    Book Now <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {filteredSalons.length === 0 && (
        <div className="text-center py-20 text-stone-500 bg-white rounded-[2rem] border border-stone-200/60 shadow-sm">
          <p className="text-xl font-medium">No salons found.</p>
          <p className="mt-2 text-stone-400">Try adjusting your search or category filter.</p>
          {(searchQuery || selectedCategory) && (
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="mt-6 px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full font-bold transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
