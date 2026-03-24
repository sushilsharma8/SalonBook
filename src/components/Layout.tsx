import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Scissors, LogOut, User as UserIcon, Map as MapIcon, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/login');
  };

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2 text-stone-900 shrink-0">
              <Scissors className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight font-display">SalonBook</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Link 
                    to={`/dashboard/${user.role.toLowerCase()}`}
                    className="text-stone-600 hover:text-stone-900 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-stone-600 hover:text-red-600 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">Login</Link>
                  <Link to="/register" className="bg-stone-900 text-white px-5 py-2 rounded-full font-medium hover:bg-stone-800 transition-colors">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-stone-200 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-2">
                {user ? (
                  <>
                    <Link 
                      to={`/dashboard/${user.role.toLowerCase()}`}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span className="font-medium">Dashboard</span>
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-600 transition-all text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link 
                      to="/login" 
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-stone-600 bg-stone-50 font-bold"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="flex items-center justify-center px-4 py-3 rounded-xl bg-stone-900 text-white font-bold"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {children}
      </main>
      
      <footer className="bg-white border-t border-stone-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 text-stone-900 mb-4">
                <Scissors className="h-6 w-6" />
                <span className="font-bold text-xl tracking-tight font-display">SalonBook</span>
              </Link>
              <p className="text-stone-500 text-sm max-w-xs leading-relaxed">
                Book hair, beauty, and wellness services instantly with the best professionals in your area.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-stone-500">
                <li><a href="#" className="hover:text-stone-900 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-stone-500">
                <li><a href="#" className="hover:text-stone-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-stone-100 text-center md:text-left text-stone-400 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} SalonBook. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-stone-900 transition-colors">Twitter</a>
              <a href="#" className="hover:text-stone-900 transition-colors">Instagram</a>
              <a href="#" className="hover:text-stone-900 transition-colors">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
