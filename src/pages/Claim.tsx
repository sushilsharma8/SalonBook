import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

type ClaimPreview = {
  salon: {
    id: string;
    name: string;
    address: string;
    listedPhoneMasked: string | null;
  };
};

export default function Claim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid claim link');
      setLoading(false);
      return;
    }
    fetch(`/api/claim/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load claim');
        return data as ClaimPreview;
      })
      .then((data) => {
        setPreview(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Claim failed');
      login(data.user, data.token);
      navigate('/dashboard/seller');
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading claim link...</div>;
  }

  if (!preview) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Claim link unavailable</h1>
          <p className="text-stone-600 mb-6">{error || 'This claim link is invalid or expired.'}</p>
          <Link to="/explore" className="inline-block bg-stone-900 text-white px-5 py-3 rounded-xl font-semibold">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Claim {preview.salon.name}</h1>
          <p className="text-stone-600 mt-2">{preview.salon.address}</p>
          {preview.salon.listedPhoneMasked && (
            <p className="text-xs text-stone-500 mt-2">Listed phone: {preview.salon.listedPhoneMasked}</p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Owner Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Business Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3"
              placeholder="you@salon.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3"
              placeholder="Minimum 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-stone-900 text-white rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {submitting ? 'Claiming...' : 'Claim Salon'}
          </button>
        </form>
      </div>
    </div>
  );
}
