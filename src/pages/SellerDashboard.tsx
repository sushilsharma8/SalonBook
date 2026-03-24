import { useEffect, useState } from 'react';
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

export default function SellerDashboard() {
  const { token, user } = useAuthStore();
  const [salon, setSalon] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showSalonForm, setShowSalonForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  
  const [salonData, setSalonData] = useState({ name: '', address: '', openTime: '09:00', closeTime: '18:00', images: '' });
  const [primaryCategory, setPrimaryCategory] = useState<string | null>(null);
  const [relatedCategories, setRelatedCategories] = useState<string[]>([]);
  const [serviceData, setServiceData] = useState({ name: '', price: '', duration: '' });
  const [staffData, setStaffData] = useState({ name: '', skills: '' });

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
        setSalon(fullSalon);
        setSalonData({ name: fullSalon.name, address: fullSalon.address, openTime: fullSalon.openTime, closeTime: fullSalon.closeTime, images: fullSalon.images ? JSON.parse(fullSalon.images).join(', ') : '' });
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
    try {
      const res = await fetch('/api/seller/salon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...salonData,
          images: JSON.stringify(salonData.images.split(',').map(s => s.trim()).filter(Boolean)),
          categories: JSON.stringify({ primary: primaryCategory, related: relatedCategories })
        })
      });
      if (res.ok) {
        setShowSalonForm(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/seller/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(serviceData)
      });
      if (res.ok) {
        setShowServiceForm(false);
        setServiceData({ name: '', price: '', duration: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
        setStaffData({ name: '', skills: '' });
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
      }
    } catch (err) {
      console.error(err);
    }
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
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8 font-display tracking-tight">Salon Details</h2>
          <form onSubmit={handleSalonSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Salon Name</label>
                <input type="text" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.name} onChange={e => setSalonData({...salonData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Address</label>
                <input type="text" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.address} onChange={e => setSalonData({...salonData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Opening Time</label>
                <input type="time" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.openTime} onChange={e => setSalonData({...salonData, openTime: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Closing Time</label>
                <input type="time" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.closeTime} onChange={e => setSalonData({...salonData, closeTime: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-2">Image URLs (comma separated)</label>
                <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.images} onChange={e => setSalonData({...salonData, images: e.target.value})} placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" />
              </div>
            </div>

            <div className="mt-12 mb-8">
              <div className="mb-8">
                <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">Account setup</p>
                <h3 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3 font-display">Select categories that best describe your business</h3>
                <p className="text-stone-500 text-sm md:text-lg">Choose your primary and up to 3 related service types</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => {
                  const isPrimary = primaryCategory === cat.id;
                  const isRelated = relatedCategories.includes(cat.id);
                  const isSelected = isPrimary || isRelated;
                  
                  return (
                    <div 
                      key={cat.id}
                      onClick={() => {
                        if (isPrimary) {
                          setPrimaryCategory(null);
                        } else if (isRelated) {
                          setRelatedCategories(relatedCategories.filter(id => id !== cat.id));
                        } else {
                          if (!primaryCategory) {
                            setPrimaryCategory(cat.id);
                          } else if (relatedCategories.length < 3) {
                            setRelatedCategories([...relatedCategories, cat.id]);
                          }
                        }
                      }}
                      className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        isPrimary ? 'border-stone-900 bg-stone-50 shadow-sm' : 
                        isRelated ? 'border-stone-300 bg-stone-50/50' : 
                        'border-stone-100 hover:border-stone-300 bg-white'
                      }`}
                    >
                      {isPrimary && (
                        <span className="absolute top-4 right-4 bg-stone-900 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">
                          Primary
                        </span>
                      )}
                      {isRelated && (
                        <span className="absolute top-4 right-4 bg-stone-200 text-stone-800 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">
                          Related
                        </span>
                      )}
                      
                      <cat.icon className={`w-8 h-8 mb-4 ${isSelected ? 'text-stone-900' : 'text-stone-400'}`} strokeWidth={1.5} />
                      <h4 className={`font-bold ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>{cat.label}</h4>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-10 pt-8 border-t border-stone-200/60">
              <button type="button" onClick={() => setShowSalonForm(false)} className="px-8 py-4 rounded-2xl font-bold text-stone-600 hover:bg-stone-100 transition-colors">Cancel</button>
              <button type="submit" className="bg-stone-900 text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold hover:bg-stone-800 transition-colors shadow-sm">Save Salon</button>
            </div>
          </form>
        </div>
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
                <form onSubmit={handleServiceSubmit} className="mb-8 space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
                  <input type="text" placeholder="Service Name" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={serviceData.name} onChange={e => setServiceData({...serviceData, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Price (₹)" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={serviceData.price} onChange={e => setServiceData({...serviceData, price: e.target.value})} />
                    <input type="number" placeholder="Duration (min)" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={serviceData.duration} onChange={e => setServiceData({...serviceData, duration: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors mt-2">Add Service</button>
                </form>
              )}
              
              <div className="space-y-4">
                {salon.services?.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-stone-200/60 transition-all hover:border-stone-300 hover:shadow-sm group">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center border border-stone-100 group-hover:bg-white transition-colors">
                        <Scissors className="w-5 h-5 text-stone-400 group-hover:text-stone-900 transition-colors" />
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-lg">{s.name}</div>
                        <div className="text-sm text-stone-500 font-medium">{s.duration} mins</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="font-bold text-stone-900 text-xl font-display">₹{s.price}</div>
                      <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
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
                <form onSubmit={handleStaffSubmit} className="mb-8 space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
                  <input type="text" placeholder="Staff Name" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={staffData.name} onChange={e => setStaffData({...staffData, name: e.target.value})} />
                  <input type="text" placeholder="Skills (comma separated)" className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={staffData.skills} onChange={e => setStaffData({...staffData, skills: e.target.value})} />
                  <button type="submit" className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors mt-2">Add Staff</button>
                </form>
              )}
              
              <div className="space-y-4">
                {salon.staff?.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-stone-200/60 transition-all hover:border-stone-300 hover:shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 shrink-0">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`} alt={s.name} className="w-full h-full object-cover" />
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
                              <span className="font-bold text-xl text-stone-900 font-display">{booking.services.map((s: any) => s.service.name).join(', ')}</span>
                              <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
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
                            <button onClick={() => updateBookingStatus(booking.id, 'COMPLETED')} className="w-full md:w-auto px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-colors">
                              <CheckCircle className="w-4 h-4 mr-1.5 inline" /> Mark Completed
                            </button>
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
