import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Scissors, Sparkles, UserRound, Store, Phone } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const isSeller = role === 'SELLER';

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) { setPhoneError('Phone number is required'); return false; }
    if (digits.length !== 10) { setPhoneError('Enter a valid 10-digit mobile number'); return false; }
    if (!/^[6-9]/.test(digits)) { setPhoneError('Indian mobile numbers start with 6-9'); return false; }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (digits.length > 0) validatePhone(digits);
    else setPhoneError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    if (!validatePhone(phone)) return;
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone, password, role, gender }),
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
            <label className="block text-sm font-medium text-stone-700 mb-2 flex items-center">
              <Phone className="w-4 h-4 mr-1.5" /> WhatsApp Number <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-4 py-3.5 rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 text-stone-600 text-sm font-bold">+91</span>
              <input 
                type="tel" 
                required 
                className={`w-full px-5 py-3.5 rounded-r-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50 ${phoneError ? 'border-red-300 bg-red-50/30' : 'border-stone-200'}`}
                value={phone} 
                onChange={e => handlePhoneChange(e.target.value)} 
                placeholder={isSeller ? '9876543210' : '9876543210'}
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            {phoneError && <p className="text-red-500 text-xs mt-1.5 font-medium">{phoneError}</p>}
            {!phoneError && <p className="text-stone-400 text-xs mt-1 flex items-center"><svg className="w-3 h-3 mr-1 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> {isSeller ? 'This should be your WhatsApp number — customers & booking alerts will be sent here' : 'This should be your WhatsApp number — booking confirmations will be sent here'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {isSeller ? 'Owner Name' : 'Full Name'} <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-stone-700 mb-2">Email <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Password <span className="text-red-500">*</span></label>
            <input 
              type="password" 
              required 
              minLength={6}
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Gender <span className="text-red-500">*</span></label>
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
