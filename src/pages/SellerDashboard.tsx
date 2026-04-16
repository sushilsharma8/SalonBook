import { Suspense, lazy, useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { Plus, Settings, Users, Calendar, CheckCircle, XCircle, Scissors, Sparkles, Eye, Activity, ThermometerSun, Droplet, PenTool, Sun, Dumbbell } from 'lucide-react';

const CATEGORIES = [
  { id: 'hair', label: 'Hair salon', icon: Scissors },
  { id: 'nails', label: 'Nails', icon: Sparkles },
  { id: 'eyebrows', label: 'Eyebrows & lashes', icon: Eye },
  { id: 'beauty', label: 'Beauty salon', icon: Sparkles },
  { id: 'medspa', label: 'Medspa', icon: Activity },
  { id: 'barber', label: 'Barber', icon: Scissors },
  { id: 'massage', label: 'Massage', icon: Activity },
  { id: 'spa', label: 'Spa & sauna', icon: ThermometerSun },
  { id: 'waxing', label: 'Waxing salon', icon: Droplet },
  { id: 'tattoo', label: 'Tattooing & piercing', icon: PenTool },
  { id: 'tanning', label: 'Tanning studio', icon: Sun },
  { id: 'fitness', label: 'Fitness & recovery', icon: Dumbbell },
];

const getStaffInitial = (name: string) => (name || 'S').trim().charAt(0).toUpperCase();

const getStaffAvatarClasses = (gender?: string | null) => {
  if (gender === 'MALE') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (gender === 'FEMALE') return 'bg-pink-100 text-pink-700 border-pink-200';
  return 'bg-stone-100 text-stone-700 border-stone-200';
};

const SellerSalonForm = lazy(() =>
  import('../components/seller/SellerDashboardForms').then((module) => ({ default: module.SellerSalonForm })),
);
const SellerServiceForm = lazy(() =>
  import('../components/seller/SellerDashboardForms').then((module) => ({ default: module.SellerServiceForm })),
);
const SellerStaffForm = lazy(() =>
  import('../components/seller/SellerDashboardForms').then((module) => ({ default: module.SellerStaffForm })),
);

function FormFallback() {
  return <div className="mb-8 rounded-2xl border border-stone-200/60 bg-stone-50 p-6 text-sm text-stone-500">Loading form...</div>;
}

export default function SellerDashboard() {
  const MAX_SALON_IMAGES = 20;
  const { token, user } = useAuthStore();
  const [salon, setSalon] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showSalonForm, setShowSalonForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  
  const [salonData, setSalonData] = useState({ name: '', address: '', openTime: '09:00', closeTime: '18:00' });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<string | null>(null);
  const [relatedCategories, setRelatedCategories] = useState<string[]>([]);
  const [serviceData, setServiceData] = useState({
    name: '',
    variants: [
      { targetGender: 'MALE', price: '', duration: '' },
      { targetGender: 'FEMALE', price: '', duration: '' },
    ],
  });
  const [salonError, setSalonError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [staffData, setStaffData] = useState({ name: '', skills: '', gender: 'OTHER' });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [salonRes, bookingsRes] = await Promise.all([
        fetch('/api/seller/salon', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/seller/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const fullSalon = await salonRes.json();
      if (!salonRes.ok) throw new Error(fullSalon.error || 'Failed to fetch salon details');
      
      if (fullSalon) {
        const parsedImages = fullSalon.images ? JSON.parse(fullSalon.images) : [];
        setSalon(fullSalon);
        setSalonData({
          name: fullSalon.name,
          address: fullSalon.address,
          openTime: fullSalon.openTime,
          closeTime: fullSalon.closeTime,
        });
        setUploadedImages(parsedImages.filter((img: string) => typeof img === 'string'));
        if (fullSalon.categories) {
          try {
            const parsed = JSON.parse(fullSalon.categories);
            setPrimaryCategory(parsed.primary || null);
            setRelatedCategories(parsed.related || []);
          } catch (e) {}
        }
      }
      
      const bookingsData = await bookingsRes.json();
      if (!bookingsRes.ok) throw new Error(bookingsData.error || 'Failed to fetch bookings');
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalonError('');

    if (uploadedImages.length === 0) {
      setSalonError('Please upload at least one salon photo.');
      return;
    }

    try {
      const res = await fetch('/api/seller/salon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...salonData,
          images: JSON.stringify(uploadedImages),
          categories: JSON.stringify({ primary: primaryCategory, related: relatedCategories })
        })
      });
      if (res.ok) {
        setShowSalonForm(false);
        fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setSalonError(data?.error || `Failed to save salon (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setSalonError('Failed to save salon');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSalonError('');

    if (uploadedImages.length + files.length > MAX_SALON_IMAGES) {
      setSalonError(`You can upload up to ${MAX_SALON_IMAGES} photos.`);
      e.target.value = '';
      return;
    }

    try {
      setUploadingImages(true);
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/seller/upload-images', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSalonError(data?.error || `Failed to upload images (HTTP ${res.status})`);
        return;
      }

      const uploadedUrls = Array.isArray(data?.urls) ? data.urls.filter((url: unknown) => typeof url === 'string') : [];
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setSalonError(err?.message || 'Failed to upload selected image(s).');
    } finally {
      setUploadingImages(false);
    }
    e.target.value = '';
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setServiceError('');
      const normalizedVariants = serviceData.variants
        .map((v) => ({
          ...v,
          price: String(v.price).trim(),
          duration: String(v.duration).trim(),
        }))
        .filter((v) => v.price || v.duration);

      if (normalizedVariants.length === 0) {
        setServiceError('Please add at least one valid variant (price + duration).');
        return;
      }

      const hasIncompleteRow = normalizedVariants.some((v) => !v.price || !v.duration);
      if (hasIncompleteRow) {
        setServiceError('Each selected variant must have both price and duration.');
        return;
      }

      const hasInvalidNumbers = normalizedVariants.some((v) => {
        const price = Number(v.price);
        const duration = Number(v.duration);
        return !Number.isInteger(price) || price <= 0 || !Number.isInteger(duration) || duration <= 0;
      });
      if (hasInvalidNumbers) {
        setServiceError('Price and duration must be positive whole numbers.');
        return;
      }

      const res = await fetch('/api/seller/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: serviceData.name.trim(),
          variants: normalizedVariants,
        })
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (res.ok) {
        setShowServiceForm(false);
        setServiceData({
          name: '',
          variants: [
            { targetGender: 'MALE', price: '', duration: '' },
            { targetGender: 'FEMALE', price: '', duration: '' },
          ],
        });
        fetchData();
      } else {
        setServiceError(data?.error || raw || `Failed to add service (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setServiceError('Failed to add service');
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seller/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(staffData)
      });
      if (res.ok) {
        setShowStaffForm(false);
        setStaffData({ name: '', skills: '', gender: 'OTHER' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(`/api/seller/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const res = await fetch(`/api/seller/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));

        const booking = bookings.find(b => b.id === id);
        if (booking?.user?.phone) {
          const phone = booking.user.phone.replace(/\D/g, '');
          const phoneNum = phone.length === 10 ? '91' + phone : phone;
          const bDate = new Date(booking.startTime);
          const services = booking.services.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ');
          const statusLabel = status === 'CONFIRMED'
            ? 'confirmed'
            : status === 'CANCELLED'
              ? 'cancelled'
              : status === 'NO_SHOW'
                ? 'marked as no-show'
                : 'completed';
          const msg = status === 'CANCELLED'
            ? `Hello ${booking.user.name}, your booking for ${services} at ${salon?.name} on ${format(bDate, 'MMM d, yyyy')} at ${format(bDate, 'h:mm a')} has been cancelled. Please contact us to reschedule.`
            : status === 'NO_SHOW'
              ? `Hello ${booking.user.name}, your booking for ${services} at ${salon?.name} on ${format(bDate, 'MMM d, yyyy')} at ${format(bDate, 'h:mm a')} was marked as no-show.`
            : `Hello ${booking.user.name}, your booking for ${services} at ${salon?.name} on ${format(bDate, 'MMM d, yyyy')} at ${format(bDate, 'h:mm a')} has been ${statusLabel}! ${status === 'CONFIRMED' ? 'See you soon!' : 'Thank you for visiting us!'}`;
          window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalonDataChange = (field: keyof typeof salonData, value: string) => {
    setSalonData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleServiceNameChange = (value: string) => {
    setServiceData((prev) => ({ ...prev, name: value }));
  };

  const handleServiceVariantChange = (index: number, field: 'price' | 'duration', value: string) => {
    setServiceData((prev) => {
      const next = [...prev.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, variants: next };
    });
  };

  const handleStaffFieldChange = (field: keyof typeof staffData, value: string) => {
    setStaffData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Scissors className="w-48 h-48 transform rotate-12" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-bold text-stone-900 mb-3 font-display tracking-tight">Seller Dashboard</h1>
          <p className="text-stone-500 text-sm md:text-lg">Manage your salon, staff, services, and bookings.</p>
        </div>
        {!salon ? (
          <button onClick={() => setShowSalonForm(true)} className="relative z-10 bg-stone-900 text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap flex items-center">
            <Plus className="w-5 h-5 mr-2" /> Setup Salon
          </button>
        ) : (
          <button onClick={() => setShowSalonForm(!showSalonForm)} className="relative z-10 bg-stone-100 text-stone-900 px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold hover:bg-stone-200 transition-colors shadow-sm whitespace-nowrap flex items-center border border-stone-200">
            <Settings className="w-5 h-5 mr-2" /> {showSalonForm ? 'Cancel Edit' : 'Edit Salon'}
          </button>
        )}
      </div>

      {salon && !showSalonForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm flex items-center space-x-5 transition-all hover:shadow-md hover:border-stone-300">
            <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100">
              <Calendar className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Total Bookings</p>
              <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{bookings.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm flex items-center space-x-5 transition-all hover:shadow-md hover:border-stone-300">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">₹{bookings.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + b.totalAmount, 0)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm flex items-center space-x-5 transition-all hover:shadow-md hover:border-stone-300">
            <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center border border-yellow-100">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{bookings.filter(b => b.status === 'PENDING').length}</p>
            </div>
          </div>
        </div>
      )}

      {showSalonForm && (
        <Suspense fallback={<FormFallback />}>
          <SellerSalonForm
            categories={CATEGORIES}
            maxSalonImages={MAX_SALON_IMAGES}
            salonData={salonData}
            uploadedImages={uploadedImages}
            primaryCategory={primaryCategory}
            relatedCategories={relatedCategories}
            uploadingImages={uploadingImages}
            salonError={salonError}
            onSubmit={handleSalonSubmit}
            onSalonDataChange={handleSalonDataChange}
            onImageUpload={handleImageUpload}
            onRemoveImage={handleRemoveUploadedImage}
            onPrimaryCategoryChange={setPrimaryCategory}
            onRelatedCategoriesChange={setRelatedCategories}
            onCancel={() => setShowSalonForm(false)}
          />
        </Suspense>
      )}

      {salon && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Management */}
          <div className="lg:col-span-1 space-y-8">
            {/* Services */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200/60">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-stone-900 flex items-center font-display tracking-tight"><Settings className="w-6 h-6 mr-3 text-stone-900" /> Services</h2>
                <button onClick={() => setShowServiceForm(!showServiceForm)} className="text-stone-900 hover:bg-stone-100 p-2.5 rounded-full transition-colors border border-stone-200"><Plus className="w-5 h-5" /></button>
              </div>
              
              {showServiceForm && (
                <Suspense fallback={<FormFallback />}>
                  <SellerServiceForm
                    serviceData={serviceData}
                    serviceError={serviceError}
                    onSubmit={handleServiceSubmit}
                    onNameChange={handleServiceNameChange}
                    onVariantChange={handleServiceVariantChange}
                  />
                </Suspense>
              )}
              
              <div className="space-y-4">
                {salon.services?.map((s: any) => (
                  <div key={s.id} className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/60 transition-all hover:border-stone-300 hover:shadow-sm group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3 sm:space-x-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-stone-50 rounded-xl flex items-center justify-center border border-stone-100 shrink-0">
                          <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400 group-hover:text-stone-900 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 text-base sm:text-lg">{s.name}</div>
                          <div className="text-xs text-stone-500 font-medium mt-1 flex flex-wrap gap-1.5">
                            {(s.variants || []).map((v: any) => (
                              <span key={v.targetGender} className="bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-md">
                                {v.targetGender}: ₹{v.price}/{v.duration}m
                              </span>
                            ))}
                            {(!s.variants || s.variants.length === 0) && <span>No variants</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!salon.services || salon.services.length === 0) && <p className="text-stone-500 text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">No services added yet.</p>}
              </div>
            </div>

            {/* Staff */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200/60">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-stone-900 flex items-center font-display tracking-tight"><Users className="w-6 h-6 mr-3 text-stone-900" /> Staff</h2>
                <button onClick={() => setShowStaffForm(!showStaffForm)} className="text-stone-900 hover:bg-stone-100 p-2.5 rounded-full transition-colors border border-stone-200"><Plus className="w-5 h-5" /></button>
              </div>
              
              {showStaffForm && (
                <Suspense fallback={<FormFallback />}>
                  <SellerStaffForm
                    staffData={staffData}
                    onSubmit={handleStaffSubmit}
                    onFieldChange={handleStaffFieldChange}
                  />
                </Suspense>
              )}
              
              <div className="space-y-4">
                {salon.staff?.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-stone-200/60 transition-all hover:border-stone-300 hover:shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl border shrink-0 flex items-center justify-center font-bold text-base ${getStaffAvatarClasses(s.gender)}`}>
                        {getStaffInitial(s.name)}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-lg">{s.name}</div>
                        <div className="text-sm text-stone-500 font-medium">{s.skills || 'General Specialist'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {(!salon.staff || salon.staff.length === 0) && <p className="text-stone-500 text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">No staff added yet.</p>}
              </div>
            </div>
          </div>

          {/* Right Column: Bookings */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8 flex items-center font-display tracking-tight"><Calendar className="w-8 h-8 mr-3 text-stone-900" /> Bookings</h2>
              
              {bookings.length === 0 ? (
                <div className="text-center py-16 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200 text-stone-500">
                  No bookings yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {bookings.map(booking => {
                    const bookingDate = new Date(booking.startTime);
                    return (
                      <div key={booking.id} className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md hover:border-stone-300">
                        <div className="flex items-start space-x-5 flex-1">
                          <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100 shrink-0 hidden sm:flex">
                            <Calendar className="w-6 h-6 text-stone-400" />
                          </div>
                          <div className="space-y-3 w-full">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-bold text-xl text-stone-900 font-display">
                                {booking.services.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ')}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                booking.status === 'NO_SHOW' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                              <div className="flex items-center text-stone-600">
                                <Users className="w-4 h-4 mr-2 text-stone-400" />
                                <span className="font-medium text-stone-900 mr-1">{booking.user.name}</span>
                              </div>
                              <div className="flex items-center text-stone-600">
                                <Scissors className="w-4 h-4 mr-2 text-stone-400" />
                                <span>Staff: <span className="font-medium text-stone-900">{booking.staff.name}</span></span>
                              </div>
                              <div className="flex items-center text-stone-600 sm:col-span-2">
                                <Calendar className="w-4 h-4 mr-2 text-stone-400" />
                                <span>{format(bookingDate, 'EEEE, MMMM d, yyyy')} at <span className="font-medium text-stone-900">{format(bookingDate, 'h:mm a')}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-4 w-full md:w-auto border-t md:border-t-0 pt-5 md:pt-0 border-stone-100 shrink-0">
                          <div className="text-2xl md:text-3xl font-bold text-stone-900 font-display">₹{booking.totalAmount}</div>
                          
                          {booking.user?.phone && (
                            <a 
                              href={`https://wa.me/${booking.user.phone.replace(/\D/g, '').length === 10 ? '91' + booking.user.phone.replace(/\D/g, '') : booking.user.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${booking.user.name}, regarding your appointment on ${format(bookingDate, 'MMM d, yyyy')} at ${format(bookingDate, 'h:mm a')}.`)}`}
                              target="_blank" 
                              rel="noreferrer" 
                              className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-[#25D366] text-white hover:bg-[#128C7E] rounded-xl text-sm font-bold transition-colors shadow-sm"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp
                            </a>
                          )}

                          {booking.status === 'PENDING' && (
                            <div className="flex space-x-2 w-full">
                              <button onClick={() => updateBookingStatus(booking.id, 'CONFIRMED')} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-sm font-bold transition-colors shadow-sm">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm
                              </button>
                              <button onClick={() => updateBookingStatus(booking.id, 'CANCELLED')} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl text-sm font-bold transition-colors border border-stone-200">
                                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                              </button>
                            </div>
                          )}
                          
                          {booking.status === 'CONFIRMED' && (
                            <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
                              <button onClick={() => updateBookingStatus(booking.id, 'COMPLETED')} className="w-full md:w-auto px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-colors">
                                <CheckCircle className="w-4 h-4 mr-1.5 inline" /> Mark Completed
                              </button>
                              <button onClick={() => updateBookingStatus(booking.id, 'NO_SHOW')} className="w-full md:w-auto px-5 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl text-sm font-bold transition-colors">
                                <XCircle className="w-4 h-4 mr-1.5 inline" /> Mark No-Show
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
