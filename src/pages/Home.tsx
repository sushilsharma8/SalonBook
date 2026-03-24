import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Search, Scissors, Sparkles, Eye, Activity, ThermometerSun, Droplet, PenTool, Sun, Dumbbell } from 'lucide-react';

interface Salon {
  id: string;
  name: string;
  address: string;
  images: string | null;
  categories: string | null;
  openTime: string;
  closeTime: string;
  services: any[];
  reviews: any[];
}

const CATEGORIES = [
  { id: 'hair', label: 'Hair', icon: Scissors },
  { id: 'nails', label: 'Nails', icon: Sparkles },
  { id: 'eyebrows', label: 'Lashes', icon: Eye },
  { id: 'beauty', label: 'Beauty', icon: Sparkles },
  { id: 'medspa', label: 'Medspa', icon: Activity },
  { id: 'barber', label: 'Barber', icon: Scissors },
  { id: 'massage', label: 'Massage', icon: Activity },
  { id: 'spa', label: 'Spa', icon: ThermometerSun },
  { id: 'waxing', label: 'Waxing', icon: Droplet },
  { id: 'tattoo', label: 'Tattoo', icon: PenTool },
  { id: 'tanning', label: 'Tanning', icon: Sun },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
];

export default function Home() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;
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

      <div className="flex items-center justify-between mb-8 mt-4">
        <h2 className="text-2xl md:text-3xl font-bold text-stone-900 font-display tracking-tight">
          {selectedCategory ? `${CATEGORIES.find(c => c.id === selectedCategory)?.label} Salons` : 'Featured Salons'}
        </h2>
        <span className="text-stone-500 font-medium">{filteredSalons.length} results</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSalons.map(salon => {
          const images = salon.images ? JSON.parse(salon.images) : ['https://picsum.photos/seed/salon/400/300'];
          const avgRating = salon.reviews.length 
            ? (salon.reviews.reduce((acc, r) => acc + r.rating, 0) / salon.reviews.length).toFixed(1)
            : 'New';

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
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold flex items-center space-x-1 shadow-sm text-stone-900">
                  <Star className="w-4 h-4 text-stone-900 fill-current" />
                  <span>{avgRating}</span>
                </div>
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
                    {salon.services.length} services
                  </span>
                  <span className="text-stone-900 font-semibold group-hover:translate-x-1 transition-transform flex items-center">
                    Book Now <span className="ml-1">&rarr;</span>
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
