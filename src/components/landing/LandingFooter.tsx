import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-stone-200 py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 text-stone-900 mb-4">
              <Scissors className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight font-display">SalonBook</span>
            </Link>
            <p className="text-stone-500 text-sm max-w-sm leading-relaxed">
              India&apos;s salon booking platform. Discover, book, and manage hair, beauty, and wellness appointments with ease.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-stone-900 mb-4 font-display">Product</h4>
            <ul className="space-y-2.5 text-sm text-stone-500">
              <li><Link to="/explore" className="hover:text-stone-900 transition-colors">Explore salons</Link></li>
              <li><a href="#how-it-works" className="hover:text-stone-900 transition-colors">How it works</a></li>
              <li><a href="#for-business" className="hover:text-stone-900 transition-colors">For business</a></li>
              <li><a href="#faq" className="hover:text-stone-900 transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-stone-900 mb-4 font-display">Account</h4>
            <ul className="space-y-2.5 text-sm text-stone-500">
              <li><Link to="/login" className="hover:text-stone-900 transition-colors">Login</Link></li>
              <li><Link to="/register" className="hover:text-stone-900 transition-colors">Sign up</Link></li>
              <li><Link to="/register" className="hover:text-stone-900 transition-colors">List your salon</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-400 text-sm">
          <p>&copy; {new Date().getFullYear()} SalonBook. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-stone-900 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-stone-900 transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-stone-900 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
