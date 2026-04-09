import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Calendar, Clock, User, Scissors, Loader2, AlertTriangle } from 'lucide-react';

export default function BookingAction() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/action/${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        return data;
      })
      .then(data => { setBooking(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  const handleAction = async (action: 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/action/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setBooking({ ...booking, status: data.status });
      setActionDone(action);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-stone-400" />
        <p className="text-stone-500 font-medium">Loading booking details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-2xl font-bold text-stone-900 font-display">Link Invalid</h2>
        <p className="text-stone-500">{error}</p>
        <Link to="/" className="inline-block mt-4 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const bookingDate = new Date(booking.startTime);
  const services = booking.services?.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ') || 'Service';
  const isPending = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Scissors className="w-8 h-8 mx-auto text-stone-400" />
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-display tracking-tight">Booking Request</h1>
        <p className="text-stone-500 text-sm">Review and respond to this booking</p>
      </div>

      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-stone-200/60 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{booking.salon?.name}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
            booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {actionDone === 'CONFIRMED' ? 'Accepted' : actionDone === 'CANCELLED' ? 'Rejected' : booking.status}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-3 text-stone-700">
            <User className="w-5 h-5 text-stone-400 shrink-0" />
            <div>
              <p className="font-bold text-stone-900">{booking.user?.name}</p>
              {booking.user?.phone && <p className="text-xs text-stone-500">{booking.user.phone}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-3 text-stone-700">
            <Scissors className="w-5 h-5 text-stone-400 shrink-0" />
            <span className="font-medium">{services}</span>
          </div>
          <div className="flex items-center space-x-3 text-stone-700">
            <Calendar className="w-5 h-5 text-stone-400 shrink-0" />
            <span>{format(bookingDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-3 text-stone-700">
            <Clock className="w-5 h-5 text-stone-400 shrink-0" />
            <span>{format(bookingDate, 'h:mm a')} ({booking.staff?.name})</span>
          </div>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center">
          <span className="text-stone-500 font-medium">Total</span>
          <span className="text-2xl font-bold text-stone-900 font-display">₹{booking.totalAmount}</span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 text-center">{error}</div>
        )}

        {actionDone ? (
          <div className={`p-4 rounded-xl text-center font-medium ${
            actionDone === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {actionDone === 'CONFIRMED' ? 'Booking accepted! The customer has been notified.' : 'Booking rejected.'}
          </div>
        ) : isPending ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleAction('CONFIRMED')}
              disabled={actionLoading}
              className="flex items-center justify-center space-x-2 bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{actionLoading ? 'Processing...' : 'Accept'}</span>
            </button>
            <button
              onClick={() => handleAction('CANCELLED')}
              disabled={actionLoading}
              className="flex items-center justify-center space-x-2 bg-white text-red-600 py-3.5 rounded-xl font-bold border-2 border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              <span>{actionLoading ? 'Processing...' : 'Reject'}</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-stone-500 text-sm py-2">
            This booking has already been {booking.status.toLowerCase()}.
          </div>
        )}
      </div>
    </div>
  );
}
