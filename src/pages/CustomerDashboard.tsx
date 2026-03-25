import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Star, X, User, ArrowRight, Edit2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomerDashboard() {
  const { token, user, setAuth } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'profile'>('upcoming');
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Review Modal State
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; salonId: string; bookingId: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch('/api/bookings/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        return data;
      })
      .then(data => {
        // Handle both old array format and new object format
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings(data.bookings || []);
          setReviews(data.reviews || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal) return;
    
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salonId: reviewModal.salonId,
          rating,
          comment
        })
      });
      
      if (res.ok) {
        const newReview = await res.json();
        setReviews([...reviews, newReview]);
        setReviewModal(null);
        setRating(5);
        setComment('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setAuth(updatedUser, token!);
        setIsEditingProfile(false);
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;

  const upcomingBookings = bookings.filter(b => new Date(b.startTime) > new Date() && b.status !== 'CANCELLED');
  const pastBookings = bookings.filter(b => new Date(b.startTime) <= new Date() || b.status === 'CANCELLED');
  const nextUpcoming = upcomingBookings
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  
  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2 md:mb-3 font-display tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-stone-500 text-base md:text-lg">Manage your upcoming appointments and history.</p>
        </div>
        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
          <div className="bg-stone-50 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border border-stone-100 text-center flex-1 md:flex-none">
            <div className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{bookings.length}</div>
            <div className="text-[10px] md:text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Bookings</div>
          </div>
          <div className="bg-stone-50 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border border-stone-100 text-center flex-1 md:flex-none">
            <div className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{reviews.length}</div>
            <div className="text-[10px] md:text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Reviews</div>
          </div>
        </div>
      </div>

      {nextUpcoming && (
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 md:p-7 rounded-[1.5rem] border border-stone-800 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-stone-300 font-bold mb-2">Next appointment</p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-display font-bold">{nextUpcoming.services.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ')}</h3>
              <p className="text-stone-300 mt-1 text-sm md:text-base">{nextUpcoming.salon.name} · {format(new Date(nextUpcoming.startTime), 'EEE, MMM d · h:mm a')}</p>
            </div>
            <Link
              to={`/salon/${nextUpcoming.salonId}`}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-sm hover:bg-stone-100 transition-colors"
            >
              View salon
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200/60 pb-4 gap-4">
          <h2 className="text-2xl font-bold text-stone-900 font-display tracking-tight">Dashboard</h2>
          <div className="flex space-x-2 bg-stone-100 p-1 rounded-xl overflow-x-auto">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Upcoming ({upcomingBookings.length})
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'past' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Past ({pastBookings.length})
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center ${activeTab === 'profile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <User className="w-4 h-4 mr-1.5" /> Profile
            </button>
          </div>
        </div>
        
        {activeTab === 'profile' ? (
          <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-stone-100 rounded-full flex items-center justify-center border border-stone-200">
                  <User className="w-6 h-6 md:w-8 md:h-8 text-stone-400" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-stone-900 font-display">Profile Details</h3>
                  <p className="text-stone-500 text-sm">Your personal information</p>
                </div>
              </div>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl font-bold transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" /> <span>Edit</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileForm({ name: user?.name || '', phone: user?.phone || '', gender: user?.gender || '' });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-colors text-sm"
                  >
                    <X className="w-4 h-4" /> <span>Cancel</span>
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center space-x-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors text-sm disabled:opacity-70"
                  >
                    <Check className="w-4 h-4" /> <span>{savingProfile ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Full Name</label>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full text-lg font-medium text-stone-900 bg-white px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                ) : (
                  <div className="text-lg font-medium text-stone-900 bg-stone-50 px-5 py-4 rounded-2xl border border-stone-100">{user?.name}</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email Address</label>
                <div className="text-lg font-medium text-stone-500 bg-stone-50 px-5 py-4 rounded-2xl border border-stone-100 cursor-not-allowed">{user?.email}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Phone Number</label>
                {isEditingProfile ? (
                  <input 
                    type="tel" 
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full text-lg font-medium text-stone-900 bg-white px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  />
                ) : (
                  <div className="text-lg font-medium text-stone-900 bg-stone-50 px-5 py-4 rounded-2xl border border-stone-100">{user?.phone || 'Not provided'}</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Account Type</label>
                <div className="text-lg font-medium text-stone-900 bg-stone-50 px-5 py-4 rounded-2xl border border-stone-100 capitalize">{user?.role.toLowerCase()}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Gender</label>
                {isEditingProfile ? (
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full text-lg font-medium text-stone-900 bg-white px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none"
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <div className="text-lg font-medium text-stone-900 bg-stone-50 px-5 py-4 rounded-2xl border border-stone-100">
                    {user?.gender ? user.gender.toLowerCase() : 'Not set'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2rem] border border-stone-200/60 text-stone-500 shadow-sm">
            You don't have any {activeTab} bookings.
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {displayedBookings.map(booking => {
              const bookingDate = new Date(booking.startTime);
              const isUpcoming = bookingDate > new Date() && booking.status !== 'CANCELLED';
              const canCancel = isUpcoming && (bookingDate.getTime() - new Date().getTime() > 2 * 60 * 60 * 1000); // > 2 hours
              const isCompleted = booking.status === 'COMPLETED';
              const hasReviewed = reviews.some(r => r.salonId === booking.salonId);

              return (
                <div key={booking.id} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-start md:items-center transition-all hover:shadow-md">
                  <div className="space-y-3 md:space-y-4 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {booking.status}
                      </span>
                      <span className="font-bold text-lg md:text-xl text-stone-900 font-display">
                        {booking.services.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ')}
                      </span>
                    </div>
                    
                    <div className="text-stone-600 space-y-1.5 md:space-y-2 text-xs md:text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-400" />
                        <span className="font-medium text-stone-800">{booking.salon.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-400" />
                        <span>{format(bookingDate, 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-400" />
                        <span>{format(bookingDate, 'h:mm a')} (with {booking.staff.name})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center space-y-0 md:space-y-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-stone-100">
                    <div className="text-2xl md:text-3xl font-bold text-stone-900 font-display">
                      ₹{booking.totalAmount}
                    </div>
                    
                    <div className="flex flex-wrap md:flex-col gap-2 justify-end">
                      {isUpcoming && booking.salon.owner?.phone && (
                        <a 
                          href={`https://wa.me/${booking.salon.owner.phone.replace(/\D/g, '').length === 10 ? '91' + booking.salon.owner.phone.replace(/\D/g, '') : booking.salon.owner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${booking.salon.owner.name}, I have an upcoming appointment at ${booking.salon.name} for ${format(bookingDate, 'MMM d, yyyy')} at ${format(bookingDate, 'h:mm a')}.`)}`}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-white bg-[#25D366] hover:bg-[#128C7E] px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center justify-center shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp
                        </a>
                      )}
                      {isUpcoming && (
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(booking.salon.address || booking.salon.name)}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center justify-center border border-stone-200"
                        >
                          <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" /> Directions
                        </a>
                      )}
                      {canCancel && (
                        <button 
                          onClick={() => handleCancel(booking.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors border border-red-100"
                        >
                          Cancel
                        </button>
                      )}
                      {isCompleted && !hasReviewed && (
                        <button 
                          onClick={() => setReviewModal({ isOpen: true, salonId: booking.salonId, bookingId: booking.id })}
                          className="text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center justify-center border border-stone-200"
                        >
                          <Star className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 fill-current" /> Review
                        </button>
                      )}
                      {isCompleted && hasReviewed && (
                        <div className="text-emerald-600 bg-emerald-50 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-sm font-semibold border border-emerald-100 flex items-center justify-center">
                          <Star className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 fill-current" /> Reviewed
                        </div>
                      )}
                      {(activeTab === 'past' || isCompleted) && (
                        <Link 
                          to={`/salon/${booking.salonId}`}
                          className="text-white bg-stone-900 hover:bg-stone-800 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center justify-center border border-stone-900"
                        >
                          Book Again <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-1.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setReviewModal(null)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-stone-900 font-display mb-2">Rate your experience</h3>
            <p className="text-stone-500 mb-6">How was your visit? Your feedback helps others.</p>
            
            <form onSubmit={submitReview} className="space-y-6">
              <div className="flex justify-center space-x-2 py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-stone-200'}`}
                  >
                    <Star className="w-10 h-10 fill-current" />
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Add a comment (optional)</label>
                <textarea
                  rows={4}
                  className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50 resize-none"
                  placeholder="Tell us what you liked..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-70"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
