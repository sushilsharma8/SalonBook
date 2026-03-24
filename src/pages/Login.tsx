import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    <div className="w-full max-w-md mx-auto px-4 py-8 md:py-16">
      <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-stone-900 mb-6 md:mb-8 font-display tracking-tight">Welcome Back</h2>
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm text-center border border-red-100">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm font-medium text-stone-700 mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none bg-stone-50/50"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium hover:bg-stone-800 transition-colors shadow-sm mt-4">
            Sign In
          </button>
        </form>
        <p className="mt-8 text-center text-stone-500">
          Don't have an account? <Link to="/register" className="text-stone-900 font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
