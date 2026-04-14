import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { ArrowLeft, Save, Plus, XCircle, Scissors, Users, Calendar, MapPin, Clock, Edit2, CheckCircle } from 'lucide-react';

export default function AdminSalonManage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [salonForm, setSalonForm] = useState({ name: '', address: '', openTime: '', closeTime: '', images: '' });

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    variants: [
      { targetGender: 'MALE', price: '', duration: '' },
      { targetGender: 'FEMALE', price: '', duration: '' },
    ],
  });

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', skills: '' });

  const fetchSalon = async () => {
    try {
      const res = await fetch(`/api/admin/salons/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSalon(data);
      const imgs = data.images ? JSON.parse(data.images) : [];
      setSalonForm({
        name: data.name, address: data.address, openTime: data.openTime, closeTime: data.closeTime,
        images: imgs.filter((i: string) => typeof i === 'string').join(', '),
      });
      setLoading(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setLoading(false);
    }
  };

  useEffect(() => { fetchSalon(); }, [id, token]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveSalon = async () => {
    setSaving(true);
    try {
      const imgs = salonForm.images.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/salons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...salonForm,
          images: JSON.stringify(imgs),
          categories: salon.categories,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      flash('success', 'Salon updated');
      setEditMode(false);
      fetchSalon();
    } catch { flash('error', 'Failed to save salon'); }
    finally { setSaving(false); }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const variants = serviceForm.variants.filter(v => v.price && v.duration).map(v => ({
      targetGender: v.targetGender, price: Number(v.price), duration: Number(v.duration),
    }));
    if (!variants.length) { flash('error', 'Add at least one variant'); return; }
    try {
      const res = await fetch(`/api/admin/salons/${id}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: serviceForm.name, variants }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      flash('success', 'Service added');
      setShowServiceForm(false);
      setServiceForm({ name: '', variants: [{ targetGender: 'MALE', price: '', duration: '' }, { targetGender: 'FEMALE', price: '', duration: '' }] });
      fetchSalon();
    } catch (err: any) { flash('error', err.message); }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Delete this service?')) return;
    try {
      await fetch(`/api/admin/salons/${id}/services/${serviceId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      flash('success', 'Service deleted');
      fetchSalon();
    } catch { flash('error', 'Failed to delete'); }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/salons/${id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(staffForm),
      });
      if (!res.ok) throw new Error('Failed');
      flash('success', 'Staff added');
      setShowStaffForm(false);
      setStaffForm({ name: '', skills: '' });
      fetchSalon();
    } catch { flash('error', 'Failed to add staff'); }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await fetch(`/api/admin/salons/${id}/staff/${staffId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      flash('success', 'Staff deleted');
      fetchSalon();
    } catch { flash('error', 'Failed to delete'); }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        flash('success', `Booking ${status.toLowerCase()}`);

        const booking = salon?.bookings?.find((b: any) => b.id === bookingId);
        if (booking?.user?.phone) {
          const phone = booking.user.phone.replace(/\D/g, '');
          const phoneNum = phone.length === 10 ? '91' + phone : phone;
          const bDate = new Date(booking.startTime);
          const svcNames = booking.services?.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ') || 'your appointment';
          const statusLabel = status === 'CONFIRMED' ? 'confirmed' : status === 'CANCELLED' ? 'cancelled' : 'completed';
          const msg = status === 'CANCELLED'
            ? `Hello ${booking.user.name}, your booking for ${svcNames} at ${salon?.name} on ${format(bDate, 'MMM d, yyyy')} at ${format(bDate, 'h:mm a')} has been cancelled by the admin. Please contact us for details.`
            : `Hello ${booking.user.name}, your booking for ${svcNames} at ${salon?.name} on ${format(bDate, 'MMM d, yyyy')} at ${format(bDate, 'h:mm a')} has been ${statusLabel}! ${status === 'CONFIRMED' ? 'See you soon!' : 'Thank you for visiting!'}`;
          window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
        }

        fetchSalon();
      }
    } catch { flash('error', 'Failed to update booking'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;
  if (!salon) return <div className="text-center py-20 text-stone-500">Salon not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>{message.text}</div>
      )}

      <div className="flex items-center gap-4">
        <Link to="/dashboard/admin" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 font-display tracking-tight">Manage: {salon.name}</h1>
          <p className="text-stone-500 text-sm">Owner: {salon.owner?.name} ({salon.owner?.email})</p>
        </div>
      </div>

      {/* Salon Details */}
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-stone-200/60">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900 font-display flex items-center"><MapPin className="w-5 h-5 mr-2" /> Salon Details</h2>
          <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-bold transition-colors">
            <Edit2 className="w-4 h-4" /> {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none" value={salonForm.name} onChange={e => setSalonForm({ ...salonForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none" value={salonForm.address} onChange={e => setSalonForm({ ...salonForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Open Time</label>
                <input type="time" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none" value={salonForm.openTime} onChange={e => setSalonForm({ ...salonForm, openTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Close Time</label>
                <input type="time" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none" value={salonForm.closeTime} onChange={e => setSalonForm({ ...salonForm, closeTime: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Image URLs (comma separated)</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none" value={salonForm.images} onChange={e => setSalonForm({ ...salonForm, images: e.target.value })} />
              </div>
            </div>
            <button onClick={handleSaveSalon} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><span className="text-stone-500">Name:</span> <span className="font-medium text-stone-900">{salon.name}</span></div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><span className="text-stone-500">Address:</span> <span className="font-medium text-stone-900">{salon.address}</span></div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><span className="text-stone-500">Hours:</span> <span className="font-medium text-stone-900">{salon.openTime} - {salon.closeTime}</span></div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><span className="text-stone-500">Owner Phone:</span> <span className="font-medium text-stone-900">{salon.owner?.phone || 'N/A'}</span></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services */}
        <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-stone-200/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900 font-display flex items-center"><Scissors className="w-5 h-5 mr-2" /> Services ({salon.services?.length || 0})</h2>
            <button onClick={() => setShowServiceForm(!showServiceForm)} className="p-2 text-stone-900 hover:bg-stone-100 rounded-full border border-stone-200"><Plus className="w-5 h-5" /></button>
          </div>
          {showServiceForm && (
            <form onSubmit={handleAddService} className="mb-6 space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
              <input type="text" placeholder="Service Name" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white text-sm" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              {serviceForm.variants.map((v, i) => (
                <div key={v.targetGender} className="grid grid-cols-3 gap-2">
                  <div className="text-xs font-bold text-stone-500 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-center">{v.targetGender}</div>
                  <input type="number" placeholder="₹ Price" className="px-3 py-2.5 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white text-sm" value={v.price}
                    onChange={e => { const n = [...serviceForm.variants]; n[i] = { ...n[i], price: e.target.value }; setServiceForm({ ...serviceForm, variants: n }); }} />
                  <input type="number" placeholder="Min" className="px-3 py-2.5 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white text-sm" value={v.duration}
                    onChange={e => { const n = [...serviceForm.variants]; n[i] = { ...n[i], duration: e.target.value }; setServiceForm({ ...serviceForm, variants: n }); }} />
                </div>
              ))}
              <button type="submit" className="w-full bg-stone-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800">Add Service</button>
            </form>
          )}
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {salon.services?.map((s: any) => (
              <div key={s.id} className="flex items-start justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 text-sm">{s.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(s.variants || []).map((v: any) => (
                      <span key={v.targetGender} className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded-md text-stone-600">{v.targetGender}: ₹{v.price}/{v.duration}m</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0"><XCircle className="w-4 h-4" /></button>
              </div>
            ))}
            {(!salon.services || salon.services.length === 0) && <p className="text-stone-500 text-center py-6 text-sm">No services</p>}
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-stone-200/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900 font-display flex items-center"><Users className="w-5 h-5 mr-2" /> Staff ({salon.staff?.length || 0})</h2>
            <button onClick={() => setShowStaffForm(!showStaffForm)} className="p-2 text-stone-900 hover:bg-stone-100 rounded-full border border-stone-200"><Plus className="w-5 h-5" /></button>
          </div>
          {showStaffForm && (
            <form onSubmit={handleAddStaff} className="mb-6 space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
              <input type="text" placeholder="Staff Name" required className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white text-sm" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
              <input type="text" placeholder="Skills (comma separated)" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white text-sm" value={staffForm.skills} onChange={e => setStaffForm({ ...staffForm, skills: e.target.value })} />
              <button type="submit" className="w-full bg-stone-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800">Add Staff</button>
            </form>
          )}
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {salon.staff?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-200 rounded-xl overflow-hidden border border-stone-300 shrink-0">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`} alt={s.name} className="w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-sm">{s.name}</div>
                    <div className="text-xs text-stone-500">{s.skills || 'General'}</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0"><XCircle className="w-4 h-4" /></button>
              </div>
            ))}
            {(!salon.staff || salon.staff.length === 0) && <p className="text-stone-500 text-center py-6 text-sm">No staff</p>}
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-stone-200/60">
        <h2 className="text-xl font-bold text-stone-900 font-display flex items-center mb-6"><Calendar className="w-5 h-5 mr-2" /> Bookings ({salon.bookings?.length || 0})</h2>
        {salon.bookings?.length === 0 ? (
          <p className="text-stone-500 text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-sm">No bookings</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            {salon.bookings?.map((b: any) => {
              const bDate = new Date(b.startTime);
              return (
                <div key={b.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{b.services.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ')}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}>{b.status}</span>
                    </div>
                    <div className="text-xs text-stone-500 space-y-0.5">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.user?.name} {b.user?.phone ? `(${b.user.phone})` : ''}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(bDate, 'MMM d, yyyy')} at {format(bDate, 'h:mm a')} · Staff: {b.staff?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold text-stone-900 font-display">₹{b.totalAmount}</span>
                    {b.status === 'PENDING' && (
                      <>
                        <button onClick={() => updateBookingStatus(b.id, 'CONFIRMED')} className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Accept</button>
                        <button onClick={() => updateBookingStatus(b.id, 'CANCELLED')} className="px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50"><XCircle className="w-3.5 h-3.5 inline mr-1" />Reject</button>
                      </>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Complete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
