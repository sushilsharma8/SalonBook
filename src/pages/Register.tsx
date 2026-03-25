import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Scissors, Sparkles, UserRound, Store } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const isSeller = role === 'SELLER';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      login(data.user, data.token);
      navigate(`/dashboard/${data.user.role.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-2 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border ${isSeller ? 'bg-stone-900 text-white border-stone-800' : 'bg-amber-50 border-amber-200 text-stone-900'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSeller ? 'bg-white/15' : 'bg-white border border-amber-200'}`}>
              {isSeller ? <Store className="w-6 h-6" /> : <UserRound className="w-6 h-6" />}
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
              {isSeller ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSeller ? 'Seller Flow' : 'Customer Flow'}</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mb-3">
            {isSeller ? 'Launch your salon profile' : 'Start booking your glow-ups'}
          </h2>
          <p className={`text-sm md:text-base ${isSeller ? 'text-stone-300' : 'text-stone-600'}`}>
            {isSeller
              ? 'Create your owner account, add services, and start accepting appointments.'
              : 'Create your customer account to discover salons, compare services, and book instantly.'}
          </p>

          <div className="mt-8 space-y-3">
            <div className={`rounded-xl px-4 py-3 text-sm ${isSeller ? 'bg-white/10' : 'bg-white border border-amber-100'}`}>
              {isSeller ? 'Tip: use your business phone for WhatsApp updates.' : 'Tip: keep profile gender updated for accurate pricing and duration.'}
            </div>
            <div className={`rounded-xl px-4 py-3 text-sm ${isSeller ? 'bg-white/10' : 'bg-white border border-amber-100'}`}>
              {isSeller ? 'Next: after signup, configure salon details and service variants.' : 'Next: after signup, choose services and preferred professionals.'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60">
          <h3 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2 font-display tracking-tight">Create Account</h3>
          <p className="text-stone-500 mb-6 md:mb-8 text-sm md:text-base">Pick your account type to see a tailored signup flow.</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              className={`px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${
                !isSeller ? 'bg-amber-50 border-amber-300 text-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole('SELLER')}
              className={`px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${
                isSeller ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Seller
            </button>
          </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm text-center border border-red-100">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {isSeller ? 'Owner Name' : 'Full Name'}
            </label>
            <input 
              type="text" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder={isSeller ? 'e.g. Priya Sharma' : 'e.g. Alex Johnson'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder={isSeller ? 'Business WhatsApp number' : 'e.g. 919876543210'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Gender</label>
            <select
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50 appearance-none"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <button type="submit" className={`w-full py-4 rounded-xl font-medium transition-colors shadow-sm mt-4 ${
            isSeller ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-amber-500 text-stone-900 hover:bg-amber-400'
          }`}>
            {isSeller ? 'Create Seller Account' : 'Create Customer Account'}
          </button>
        </form>
        <p className="mt-8 text-center text-stone-500">
          Already have an account? <Link to="/login" className="text-stone-900 font-semibold hover:underline">Sign in</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
