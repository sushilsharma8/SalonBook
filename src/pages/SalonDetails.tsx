import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MapPin, Clock, Star, Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';

export default function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Booking state
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<{ time: string, available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const getEffectiveVariant = (service: any) => {
    const variants = service.variants || [];
    const genderTarget = user?.gender === 'FEMALE' ? 'FEMALE' : user?.gender === 'MALE' ? 'MALE' : null;
    const exact = genderTarget ? variants.find((v: any) => v.targetGender === genderTarget) : null;
    const unisex = variants.find((v: any) => v.targetGender === 'UNISEX');
    if (user?.gender === 'OTHER') return unisex || null;
    if (!user?.gender) return null;
    return exact || unisex || null;
  };

  const visibleServices = salon?.services?.filter((service: any) => {
    if (!user?.gender) return true;
    return Boolean(getEffectiveVariant(service));
  }) || [];

  useEffect(() => {
    fetch(`/api/salons/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        return data;
      })
      .then(data => {
        setSalon(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!salon || selectedServices.length === 0 || !selectedDate || !token || user?.role !== 'CUSTOMER') {
      setTimeSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const serviceIds = selectedServices.map(s => s.id).join(',');
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await fetch(`/api/slots?salonId=${salon.id}&serviceIds=${serviceIds}&date=${dateStr}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setTimeSlots(data.slots || []);
        } else {
          setTimeSlots([]);
        }
      } catch (err) {
        console.error(err);
        setTimeSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [salon, selectedServices, selectedDate, token, user?.role]);

  useEffect(() => {
    setSelectedServices((prev) => prev.filter((service) => visibleServices.some((visible: any) => visible.id === service.id)));
  }, [user?.gender, salon]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [salon?.id]);

  const handleBook = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      setErrorMessage('Only customers can book services. Please log in with a customer account.');
      return;
    }
    if (!selectedServices.length || !selectedTime) return;

    setBookingLoading(true);
    try {
      // Combine date and time in UTC format to avoid timezone issues
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeStr = `${selectedTime}:00.000Z`;
      const bookingTimeStr = `${dateStr}T${timeStr}`;

      // 1. Create Booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salonId: salon.id,
          serviceIds: selectedServices.map(s => s.id),
          time: bookingTimeStr,
          totalAmount: 0
        }),
      });
      
      const bookingData = await res.json();
      if (!res.ok) throw new Error(bookingData.error);
      
      setSuccessMessage('Booking successful! You can pay at the shop directly.');

      if (salon.owner?.phone && bookingData.actionToken) {
        const ownerPhone = salon.owner.phone.replace(/\D/g, '');
        const phoneNum = ownerPhone.length === 10 ? '91' + ownerPhone : ownerPhone;
        const actionUrl = `${window.location.origin}/booking/action/${bookingData.actionToken}`;
        const whatsappMsg = `Hello ${salon.owner.name}, you have a new booking at ${salon.name}!\n\n` +
          `Customer: ${user?.name}\n` +
          `Services: ${selectedServices.map(s => s.name).join(', ')}\n` +
          `Date: ${format(selectedDate, 'MMM d, yyyy')} at ${selectedTime}\n\n` +
          `Accept or reject here:\n${actionUrl}`;
        window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
      }
      
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredTimeSlots = timeSlots.filter(slot => {
    const [hours, minutes] = slot.time.split(':');
    const slotTime = new Date(selectedDate);
    slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return slotTime > new Date();
  });

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;
  if (!salon) return <div className="text-center py-20 text-stone-500">Salon not found</div>;

  const images = (() => {
    if (!salon.images) return ['https://picsum.photos/seed/salon/800/400'];
    try {
      const parsed = JSON.parse(salon.images);
      const usable = Array.isArray(parsed) ? parsed.filter((img) => typeof img === 'string' && img.trim().length > 0) : [];
      return usable.length ? usable : ['https://picsum.photos/seed/salon/800/400'];
    } catch {
      return ['https://picsum.photos/seed/salon/800/400'];
    }
  })();
  
  // Generate next 7 days
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(startOfToday(), i));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 lg:pb-8">
      {/* Mobile Floating Book Button */}
      {selectedServices.length === 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden w-full px-6">
          <button 
            onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center space-x-2"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Book Now</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-sm border border-stone-200/60">
        <div className="h-56 md:h-80 overflow-hidden bg-stone-100">
          <img
            src={images[Math.min(selectedImageIndex, images.length - 1)]}
            alt={`${salon.name} preview`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        {images.length > 1 && (
          <div className="px-6 md:px-10 pt-4 grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 bg-white">
            {images.map((image: string, index: number) => (
              <button
                key={`${index}-${image.slice(0, 20)}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImageIndex === index
                    ? 'border-stone-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <img src={image} alt={`${salon.name} photo ${index + 1}`} className="w-full h-16 md:h-20 object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
        <div className="p-6 md:p-10 bg-gradient-to-b from-white to-stone-50/70">
          <h1 className="text-2xl md:text-5xl font-bold text-stone-900 mb-6 font-display tracking-tight">{salon.name}</h1>
          <div className="flex flex-wrap gap-3 md:gap-6 text-stone-600">
            <div className="flex items-center space-x-2 bg-stone-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-stone-100 text-sm md:text-base">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-stone-900" />
              <span className="font-medium">{salon.address}</span>
            </div>
            <div className="flex items-center space-x-2 bg-stone-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-stone-100 text-sm md:text-base">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-stone-900" />
              <span className="font-medium">{salon.openTime} - {salon.closeTime}</span>
            </div>
            <div className="flex items-center space-x-2 bg-stone-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-stone-100 text-sm md:text-base">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-current" />
              <span className="font-medium">{salon.reviews?.length || 0} Reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Services & Staff & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          <div id="services-section" className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-xl md:text-3xl font-bold text-stone-900 font-display tracking-tight">Services</h2>
              <span className="text-xs md:text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
                {visibleServices.length} listed
              </span>
            </div>
            <div className="space-y-4">
              {visibleServices.map((service: any) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                <div 
                  key={service.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
                    } else {
                      setSelectedServices(prev => [...prev, service]);
                    }
                    setSelectedTime('');
                    // On mobile, scroll to staff selection
                    if (!isSelected && window.innerWidth < 1024) {
                      // staff selection removed; scroll to booking widget
                      setTimeout(() => {
                        document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                    isSelected 
                      ? 'border-stone-900 bg-stone-50 shadow-sm' 
                      : 'border-stone-100 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-stone-900 text-base md:text-lg">{service.name}</h3>
                    <p className="text-xs md:text-sm text-stone-500 mt-1">
                      {getEffectiveVariant(service)?.duration ? `${getEffectiveVariant(service)?.duration} mins` : 'Duration depends on profile'}
                    </p>
                  </div>
                  <div className="font-bold text-stone-900 text-lg md:text-xl">
                    {getEffectiveVariant(service)?.price ? `₹${getEffectiveVariant(service)?.price}` : 'Profile based'}
                  </div>
                </div>
              )})}
              {visibleServices.length === 0 && (
                <p className="text-stone-500">
                  No services available for your profile gender.
                </p>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          {salon.reviews && salon.reviews.length > 0 && (
            <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
                <h2 className="text-xl md:text-3xl font-bold text-stone-900 font-display tracking-tight">Customer Reviews</h2>
                <div className="flex items-center bg-stone-50 px-4 py-2 rounded-xl border border-stone-100 w-fit">
                  <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                  <span className="font-bold text-stone-900 text-lg">
                    {(salon.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / salon.reviews.length).toFixed(1)}
                  </span>
                  <span className="text-stone-500 ml-1 text-sm">({salon.reviews.length})</span>
                </div>
              </div>
              
              <div className="space-y-6">
                {salon.reviews.map((review: any) => (
                  <div key={review.id} className="border-b border-stone-100 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center overflow-hidden border border-stone-200">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user?.name || 'User'}`} alt={review.user?.name || 'User'} />
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 text-sm md:text-base">{review.user?.name || 'Anonymous User'}</div>
                          <div className="text-[10px] md:text-xs text-stone-500">{format(new Date(review.createdAt), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                      <div className="flex items-center bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-100">
                        <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                        <span className="font-bold text-stone-900 text-xs">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-stone-600 mt-2 text-xs md:text-sm leading-relaxed bg-stone-50/50 p-3 md:p-4 rounded-2xl border border-stone-100/50">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Booking Widget */}
        <div id="booking-section" className="lg:col-span-1 scroll-mt-24">
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-200/60 sticky top-24">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-lg md:text-2xl font-bold text-stone-900 font-display tracking-tight">Book Appointment</h2>
              {selectedServices.length > 0 && (
                <span className="text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200">
                  {selectedServices.length} selected
                </span>
              )}
            </div>
            
            {selectedServices.length === 0 ? (
              <div className="text-center py-10 md:py-12 text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-sm md:text-base">
                Please select at least one service first
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-in fade-in">
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map((service: any) => (
                    <span key={service.id} className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full">
                      {service.name}
                    </span>
                  ))}
                </div>
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-4 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" /> Select Date
                  </label>
                  <div className="flex space-x-2 md:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                    {dates.map((date, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 w-14 md:w-16 py-3 md:py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${
                          selectedDate.getTime() === date.getTime()
                            ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-80 mb-1">{format(date, 'EEE')}</span>
                        <span className="text-lg md:text-xl font-bold">{format(date, 'd')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> Select Time
                  </label>
                  {slotsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
                    </div>
                  ) : filteredTimeSlots.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-sm">
                      No available slots for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 md:gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredTimeSlots.map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold border-2 transition-all ${
                            !slot.available
                              ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-60'
                              : selectedTime === slot.time
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-b from-stone-50 to-white p-5 md:p-6 rounded-2xl border border-stone-200/60">
                  {!user?.gender && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                      Please set your gender in profile to see final pricing and continue booking.
                    </p>
                  )}
                  <div className="mb-4">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between mb-2">
                        <span className="text-stone-600 font-medium text-sm md:text-base">{s.name}</span>
                        <span className="font-bold text-stone-900 text-sm md:text-base">
                          ₹{getEffectiveVariant(s)?.price ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs md:text-sm text-stone-500 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-stone-200">
                    <span>With assigned professional</span>
                    <span>{selectedServices.reduce((acc, s) => acc + (getEffectiveVariant(s)?.duration ?? 0), 0)} min</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-stone-900">Total to pay</span>
                    <span className="text-xl md:text-3xl font-bold text-stone-900 font-display">
                      ₹{selectedServices.reduce((acc, s) => acc + (getEffectiveVariant(s)?.price ?? 0), 0)}
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-stone-500 flex items-center">
                    <CreditCard className="w-3 h-3 mr-1.5" />
                    Pay at shop directly
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 mb-4">
                    {errorMessage}
                  </div>
                )}

                {successMessage ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 font-medium text-center">
                      {successMessage}
                    </div>
                    
                    {salon.owner?.phone && (
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <div className="flex items-center justify-center gap-2 text-emerald-700 font-medium text-sm">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Seller notified via WhatsApp
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">A WhatsApp message with accept/reject link was sent automatically.</p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => navigate('/dashboard/customer')}
                      className="w-full bg-stone-100 text-stone-900 py-3.5 md:py-4 rounded-2xl font-bold text-base md:text-lg hover:bg-stone-200 transition-colors shadow-sm"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleBook}
                      disabled={!selectedTime || bookingLoading || (user && user.role !== 'CUSTOMER') || !user?.gender}
                      className="w-full bg-stone-900 text-white py-3.5 md:py-4 rounded-2xl font-bold text-base md:text-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {bookingLoading ? 'Processing...' : (user && user.role !== 'CUSTOMER' ? 'Booking Restricted' : (!user?.gender ? 'Set Gender in Profile' : 'Book Appointment'))}
                    </button>
                    {user && user.role !== 'CUSTOMER' && (
                      <p className="text-xs text-red-500 text-center font-medium mt-2">
                        Only customer accounts can book services.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
