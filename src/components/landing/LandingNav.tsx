import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Scissors, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const navLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For Business', href: '#for-business' },
  { label: 'FAQ', href: '#faq' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl border-b border-stone-200/80 shadow-sm'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <Link
              to="/"
              className={`flex items-center space-x-2 shrink-0 transition-colors ${
                scrolled ? 'text-stone-900' : 'text-white'
              }`}
            >
              <Scissors className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight font-display">SalonBook</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-stone-600 hover:text-stone-900'
                      : 'text-stone-200 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to={`/dashboard/${user.role.toLowerCase()}`}
                    className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                      scrolled
                        ? 'text-stone-600 hover:text-stone-900'
                        : 'text-stone-200 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`btn-interactive text-sm font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer ${
                      scrolled
                        ? 'bg-stone-900 text-white hover:bg-stone-800'
                        : 'bg-white text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                      scrolled
                        ? 'text-stone-600 hover:text-stone-900'
                        : 'text-stone-200 hover:text-white'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={`btn-interactive text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
                      scrolled
                        ? 'bg-stone-900 text-white hover:bg-stone-800'
                        : 'bg-white text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-stone-700' : 'text-white'
              }`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              className="absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-stone-700 font-medium hover:bg-stone-50"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-stone-100">
                {user ? (
                  <>
                    <Link
                      to={`/dashboard/${user.role.toLowerCase()}`}
                      onClick={() => setMenuOpen(false)}
                      className="btn-interactive flex items-center justify-center px-4 py-3 rounded-xl text-stone-700 bg-stone-50 font-bold"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn-interactive flex items-center justify-center px-4 py-3 rounded-xl bg-stone-900 text-white font-bold cursor-pointer"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="btn-interactive flex items-center justify-center px-4 py-3 rounded-xl text-stone-700 bg-stone-50 font-bold"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="btn-interactive flex items-center justify-center px-4 py-3 rounded-xl bg-stone-900 text-white font-bold"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
