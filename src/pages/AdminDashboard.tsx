import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Users, Scissors, Calendar, IndianRupee, Trash2, Shield, Settings, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<any>({ users: 0, salons: 0, bookings: 0, revenue: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'salons'>('dashboard');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch('/api/admin/activity', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch('/api/admin/salons', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ]).then(([statsData, activityData, usersData, salonsData]) => {
      if (!statsData.error) setStats(statsData);
      if (!activityData.error) setActivity(activityData);
      if (!usersData.error) setUsers(usersData);
      if (!salonsData.error) setSalons(salonsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setStats({ ...stats, users: stats.users - 1 });
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReactivateUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, isActive: true } : u));
        flash('success', 'User account reactivated');
      } else {
        flash('error', data?.error || 'Failed to reactivate user');
      }
    } catch (err) {
      console.error(err);
      flash('error', 'Failed to reactivate user');
    }
  };

  const handleDeleteSalon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salon?')) return;
    try {
      const res = await fetch(`/api/admin/salons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSalons(salons.filter(s => s.id !== id));
        setStats({ ...stats, salons: stats.salons - 1 });
        flash('success', 'Salon deleted successfully');
      } else {
        const data = await res.json().catch(() => null);
        flash('error', data?.error || 'Failed to delete salon');
      }
    } catch (err) {
      console.error(err);
      flash('error', 'Failed to delete salon');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-stone-900 mb-3 font-display tracking-tight">Admin Dashboard</h1>
          <p className="text-stone-500 text-sm md:text-lg">Platform overview and management.</p>
        </div>
        <div className="flex space-x-2 bg-stone-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('salons')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'salons' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Salons
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 md:p-7 rounded-[1.5rem] border border-stone-800">
            <p className="text-xs uppercase tracking-wider text-stone-300 font-bold mb-2">Platform health</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/10 rounded-xl px-4 py-3">Active users: <span className="font-bold">{stats.users}</span></div>
              <div className="bg-white/10 rounded-xl px-4 py-3">Active salons: <span className="font-bold">{stats.salons}</span></div>
              <div className="bg-white/10 rounded-xl px-4 py-3">Bookings tracked: <span className="font-bold">{stats.bookings}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex items-center space-x-5 transition-all hover:shadow-md">
              <div className="p-4 bg-stone-100 text-stone-900 rounded-2xl border border-stone-200/60">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-1">Total Users</p>
                <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{stats.users}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex items-center space-x-5 transition-all hover:shadow-md">
              <div className="p-4 bg-stone-100 text-stone-900 rounded-2xl border border-stone-200/60">
                <Scissors className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-1">Active Salons</p>
                <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{stats.salons}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex items-center space-x-5 transition-all hover:shadow-md">
              <div className="p-4 bg-stone-100 text-stone-900 rounded-2xl border border-stone-200/60">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-1">Total Bookings</p>
                <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">{stats.bookings}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex items-center space-x-5 transition-all hover:shadow-md">
              <div className="p-4 bg-stone-100 text-stone-900 rounded-2xl border border-stone-200/60">
                <IndianRupee className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-1">Platform Revenue</p>
                <p className="text-2xl md:text-3xl font-bold text-stone-900 font-display">₹{stats.revenue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60">
            <h2 className="text-2xl font-bold text-stone-900 mb-8 font-display tracking-tight">Recent Activity</h2>
            <div className="space-y-4">
              {activity.length === 0 ? (
                <p className="text-stone-500 text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">No recent activity.</p>
              ) : (
                activity.map((item, index) => (
                  <div key={item.id} className="flex flex-col p-5 bg-stone-50 rounded-2xl border border-stone-200/60 transition-all hover:border-stone-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center font-bold border border-stone-200 shadow-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-base md:text-lg">New booking at {item.salon?.name || 'Salon'}</p>
                          <p className="text-sm text-stone-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedActivity(selectedActivity === item.id ? null : item.id)}
                        className="text-sm font-bold text-stone-900 hover:underline cursor-pointer px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                      >
                        {selectedActivity === item.id ? 'Close' : 'View'}
                      </button>
                    </div>
                    {selectedActivity === item.id && (
                      <div className="mt-4 p-4 bg-white rounded-xl border border-stone-200 text-stone-600 text-sm space-y-2">
                        <p><strong>Customer:</strong> {item.user?.name} ({item.user?.email})</p>
                        <p><strong>Services:</strong> {item.services?.map((s: any) => s.serviceNameAtBooking || s.service?.name).join(', ')}</p>
                        <p><strong>Amount:</strong> ₹{item.totalAmount}</p>
                        <p><strong>Status:</strong> {item.status}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60 animate-in fade-in duration-500">
          <h2 className="text-2xl font-bold text-stone-900 mb-8 font-display tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-3 text-stone-400" /> Manage Users
          </h2>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-sm text-stone-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">Name</th>
                  <th className="pb-4 font-bold">Email</th>
                  <th className="pb-4 font-bold">Role</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold">No-Shows</th>
                  <th className="pb-4 font-bold">Joined</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-stone-700">
                {users.map(u => (
                  <tr key={u.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="py-4 font-medium text-stone-900">{u.name}</td>
                    <td className="py-4">{u.email}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'SELLER' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-medium">{u.noShowCount ?? 0}</td>
                    <td className="py-4 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <div className="flex items-center justify-end gap-1">
                          {!u.isActive && (
                            <button onClick={() => handleReactivateUser(u.id)} className="p-2 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Reactivate User">
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      {u.role === 'ADMIN' && (
                        <span className="p-2 text-stone-300 inline-block" title="Cannot delete admin"><Shield className="w-5 h-5" /></span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (<tr><td colSpan={7} className="py-8 text-center text-stone-500">No users found.</td></tr>)}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 text-sm truncate">{u.name}</div>
                  <div className="text-xs text-stone-500 truncate">{u.email}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'SELLER' ? 'bg-blue-100 text-blue-800' :
                      'bg-stone-100 text-stone-800'
                    }`}>{u.role}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>{u.isActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
                    <span className="text-[10px] text-stone-500">No-show: {u.noShowCount ?? 0}</span>
                    <span className="text-[10px] text-stone-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {u.role !== 'ADMIN' ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {!u.isActive && (
                      <button onClick={() => handleReactivateUser(u.id)} className="p-2 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <span className="p-2 text-stone-300 shrink-0"><Shield className="w-4 h-4" /></span>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="py-8 text-center text-stone-500 text-sm">No users found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'salons' && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60 animate-in fade-in duration-500">
          <h2 className="text-2xl font-bold text-stone-900 mb-8 font-display tracking-tight flex items-center">
            <Scissors className="w-6 h-6 mr-3 text-stone-400" /> Manage Salons
          </h2>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-sm text-stone-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">Salon Name</th>
                  <th className="pb-4 font-bold">Owner</th>
                  <th className="pb-4 font-bold">Address</th>
                  <th className="pb-4 font-bold">Created</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-stone-700">
                {salons.map(s => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="py-4 font-medium text-stone-900">{s.name}</td>
                    <td className="py-4"><div>{s.owner?.name}</div><div className="text-xs text-stone-500">{s.owner?.email}</div></td>
                    <td className="py-4 text-sm max-w-[200px] truncate" title={s.address}>{s.address}</td>
                    <td className="py-4 text-sm">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/salon/${s.id}`} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors" title="Manage Salon"><Settings className="w-5 h-5" /></Link>
                        <button onClick={() => handleDeleteSalon(s.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Salon"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {salons.length === 0 && (<tr><td colSpan={5} className="py-8 text-center text-stone-500">No salons found.</td></tr>)}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {salons.map(s => (
              <div key={s.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 text-sm">{s.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{s.owner?.name} · {s.owner?.email}</div>
                  <div className="text-xs text-stone-400 mt-1 truncate">{s.address}</div>
                  <div className="text-[10px] text-stone-400 mt-1">{new Date(s.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link to={`/admin/salon/${s.id}`} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"><Settings className="w-4 h-4" /></Link>
                  <button onClick={() => handleDeleteSalon(s.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {salons.length === 0 && <p className="py-8 text-center text-stone-500 text-sm">No salons found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
