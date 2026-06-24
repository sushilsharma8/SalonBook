import { type ChangeEvent, type ComponentType, type FormEvent, useState } from 'react';
import { WEEKDAYS, type SalonDayHours } from '../../lib/salonHours';

type Category = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

type SalonData = {
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
};

type ServiceVariant = {
  targetGender: string;
  price: string;
  duration: string;
};

type ServiceData = {
  name: string;
  variants: ServiceVariant[];
};

export function getGenderVariantStyles(targetGender: string) {
  if (targetGender === 'MALE') {
    return {
      row: 'rounded-xl border border-blue-100 bg-blue-50/60 p-2',
      label: 'bg-blue-100 text-blue-800 border-blue-200',
      input: 'border-blue-200 bg-white focus:ring-blue-400 focus:border-blue-300',
    };
  }
  if (targetGender === 'FEMALE') {
    return {
      row: 'rounded-xl border border-pink-100 bg-pink-50/60 p-2',
      label: 'bg-pink-100 text-pink-800 border-pink-200',
      input: 'border-pink-200 bg-white focus:ring-pink-400 focus:border-pink-300',
    };
  }
  return {
    row: 'rounded-xl border border-stone-200 bg-stone-50/60 p-2',
    label: 'bg-stone-100 text-stone-700 border-stone-200',
    input: 'border-stone-200 bg-white focus:ring-stone-900',
  };
}

export type ImportedServiceDraft = {
  name: string;
  variants: ServiceVariant[];
};

type StaffData = {
  name: string;
  skills: string;
  gender: string;
};

interface SellerSalonFormProps {
  categories: Category[];
  maxSalonImages: number;
  salonData: SalonData;
  weeklyHours: SalonDayHours[];
  uploadedImages: string[];
  primaryCategory: string | null;
  relatedCategories: string[];
  uploadingImages: boolean;
  salonError: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSalonDataChange: (field: keyof SalonData, value: string) => void;
  onWeeklyHoursChange: (hours: SalonDayHours[]) => void;
  onApplyDefaultHoursToOpenDays: () => void;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onPrimaryCategoryChange: (next: string | null) => void;
  onRelatedCategoriesChange: (next: string[]) => void;
  onCancel: () => void;
}

interface SellerServiceFormProps {
  serviceData: ServiceData;
  serviceError: string;
  submitLabel?: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onVariantChange: (index: number, field: 'price' | 'duration', value: string) => void;
  onCancel?: () => void;
}

interface SellerStaffFormProps {
  staffData: StaffData;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof StaffData, value: string) => void;
}

interface SellerMenuImportReviewModalProps {
  services: ImportedServiceDraft[];
  importError: string;
  importing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onServiceNameChange: (index: number, value: string) => void;
  onVariantChange: (serviceIndex: number, variantIndex: number, field: 'price' | 'duration', value: string) => void;
  onRemoveService: (index: number) => void;
}

export function SellerSalonForm({
  categories,
  maxSalonImages,
  salonData,
  weeklyHours,
  uploadedImages,
  primaryCategory,
  relatedCategories,
  uploadingImages,
  salonError,
  onSubmit,
  onSalonDataChange,
  onWeeklyHoursChange,
  onApplyDefaultHoursToOpenDays,
  onImageUpload,
  onRemoveImage,
  onPrimaryCategoryChange,
  onRelatedCategoriesChange,
  onCancel,
}: SellerSalonFormProps) {
  return (
    <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-stone-200/60">
      <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8 font-display tracking-tight">Salon Details</h2>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Salon Name</label>
            <input type="text" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.name} onChange={(e) => onSalonDataChange('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Address</label>
            <input type="text" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.address} onChange={(e) => onSalonDataChange('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Opening Time</label>
            <input type="time" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.openTime} onChange={(e) => onSalonDataChange('openTime', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Closing Time</label>
            <input type="time" required className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50" value={salonData.closeTime} onChange={(e) => onSalonDataChange('closeTime', e.target.value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-display">Weekly schedule</h3>
              <p className="text-sm text-stone-500 mt-1">Choose which days your salon is open and set hours for each day.</p>
            </div>
            <button
              type="button"
              onClick={onApplyDefaultHoursToOpenDays}
              className="text-sm font-semibold text-stone-700 bg-white border border-stone-200 px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            >
              Apply default hours to open days
            </button>
          </div>
          <div className="space-y-2">
            {WEEKDAYS.map(({ dayOfWeek, label }) => {
              const day = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek)!;
              return (
                <div
                  key={dayOfWeek}
                  className={`grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 sm:gap-4 items-center p-3 rounded-xl border ${
                    day.isOpen ? 'bg-white border-stone-200' : 'bg-stone-100/80 border-stone-200/60'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isOpen}
                      onChange={(e) => {
                        const isOpen = e.target.checked;
                        onWeeklyHoursChange(
                          weeklyHours.map((h) =>
                            h.dayOfWeek === dayOfWeek
                              ? {
                                  ...h,
                                  isOpen,
                                  startTime: isOpen ? salonData.openTime : h.startTime,
                                  endTime: isOpen ? salonData.closeTime : h.endTime,
                                }
                              : h
                          )
                        );
                      }}
                      className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span className="font-semibold text-stone-900 w-28">{label}</span>
                    {!day.isOpen && <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Closed</span>}
                  </label>
                  {day.isOpen ? (
                    <div className="flex items-center gap-2 sm:justify-end">
                      <input
                        type="time"
                        required
                        value={day.startTime}
                        onChange={(e) =>
                          onWeeklyHoursChange(
                            weeklyHours.map((h) =>
                              h.dayOfWeek === dayOfWeek ? { ...h, startTime: e.target.value } : h
                            )
                          )
                        }
                        className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-stone-900 outline-none"
                      />
                      <span className="text-stone-400 text-sm">to</span>
                      <input
                        type="time"
                        required
                        value={day.endTime}
                        onChange={(e) =>
                          onWeeklyHoursChange(
                            weeklyHours.map((h) =>
                              h.dayOfWeek === dayOfWeek ? { ...h, endTime: e.target.value } : h
                            )
                          )
                        }
                        className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-stone-900 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-stone-400 sm:text-right">Not accepting bookings</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">Upload Salon Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              disabled={uploadingImages}
              className="w-full px-5 py-3.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none bg-stone-50/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-900 file:text-white hover:file:bg-stone-800"
            />
            <p className="mt-2 text-xs text-stone-500">
              Upload from your device only. You can select multiple photos and upload again to add more.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Up to {maxSalonImages} photos. Each image can be up to 15MB.
            </p>
            {uploadingImages && <p className="mt-2 text-xs text-stone-500">Uploading images...</p>}
            {salonError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {salonError}
              </div>
            )}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {uploadedImages.map((img, idx) => (
                  <div key={`${idx}-${img.slice(0, 20)}`} className="relative rounded-xl overflow-hidden border border-stone-200 bg-white">
                    <img src={img} alt={`Uploaded ${idx + 1}`} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs px-2 py-1 rounded-md border border-stone-200 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 mb-8">
          <div className="mb-8">
            <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">Account setup</p>
            <h3 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3 font-display">Select categories that best describe your business</h3>
            <p className="text-stone-500 text-sm md:text-lg">Choose your primary and up to 3 related service types</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const isPrimary = primaryCategory === cat.id;
              const isRelated = relatedCategories.includes(cat.id);
              const isSelected = isPrimary || isRelated;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (isPrimary) {
                      onPrimaryCategoryChange(null);
                    } else if (isRelated) {
                      onRelatedCategoriesChange(relatedCategories.filter((id) => id !== cat.id));
                    } else if (!primaryCategory) {
                      onPrimaryCategoryChange(cat.id);
                    } else if (relatedCategories.length < 3) {
                      onRelatedCategoriesChange([...relatedCategories, cat.id]);
                    }
                  }}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    isPrimary ? 'border-stone-900 bg-stone-50 shadow-sm'
                      : isRelated ? 'border-stone-300 bg-stone-50/50'
                        : 'border-stone-100 hover:border-stone-300 bg-white'
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
          <button type="button" onClick={onCancel} className="px-8 py-4 rounded-2xl font-bold text-stone-600 hover:bg-stone-100 transition-colors">Cancel</button>
          <button type="submit" className="bg-stone-900 text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold hover:bg-stone-800 transition-colors shadow-sm">Save Salon</button>
        </div>
      </form>
    </div>
  );
}

export function SellerServiceForm({
  serviceData,
  serviceError,
  submitLabel = 'Add Service',
  onSubmit,
  onNameChange,
  onVariantChange,
  onCancel,
}: SellerServiceFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
      <input type="text" placeholder="Service Name" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={serviceData.name} onChange={(e) => onNameChange(e.target.value)} />
      <div className="space-y-3">
        {serviceData.variants.map((variant, index) => {
          const styles = getGenderVariantStyles(variant.targetGender);
          return (
          <div key={variant.targetGender} className={`grid grid-cols-3 gap-3 items-center ${styles.row}`}>
            <div className={`text-xs font-bold border rounded-xl px-3 py-3 text-center ${styles.label}`}>
              {variant.targetGender}
            </div>
            <input
              type="number"
              placeholder="Price (Rs)"
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ${styles.input}`}
              value={variant.price}
              onChange={(e) => onVariantChange(index, 'price', e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (min)"
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ${styles.input}`}
              value={variant.duration}
              onChange={(e) => onVariantChange(index, 'duration', e.target.value)}
            />
          </div>
          );
        })}
      </div>
      {serviceError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {serviceError}
        </div>
      )}
      <div className={`flex gap-2 mt-2 ${onCancel ? '' : ''}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 bg-white text-stone-700 py-3.5 rounded-xl font-bold hover:bg-stone-100 transition-colors border border-stone-200">
            Cancel
          </button>
        )}
        <button type="submit" className={`${onCancel ? 'flex-1' : 'w-full'} bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

type StaffTimeOffEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

interface StaffTimeOffPanelProps {
  staffId: string;
  salonOpenTime: string;
  salonCloseTime: string;
  timeOff: StaffTimeOffEntry[];
  token: string;
  onUpdated: () => void;
}

export function StaffTimeOffPanel({
  staffId,
  salonOpenTime,
  salonCloseTime,
  timeOff,
  token,
  onUpdated,
}: StaffTimeOffPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(salonOpenTime);
  const [endTime, setEndTime] = useState(salonCloseTime);
  const [allDay, setAllDay] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Pick a date for time off.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/seller/staff/${staffId}/time-off`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, startTime, endTime, allDay }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add time off');
      setDate('');
      setAllDay(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time off');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (timeOffId: string) => {
    try {
      const res = await fetch(`/api/seller/staff/${staffId}/time-off/${timeOffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const formatOffDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors"
      >
        {expanded ? 'Hide time off' : `Manage time off${timeOff.length ? ` (${timeOff.length})` : ''}`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {timeOff.length === 0 ? (
            <p className="text-xs text-stone-500">No time off scheduled. Add dates when this staff member is unavailable.</p>
          ) : (
            <div className="space-y-2">
              {timeOff.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 text-xs bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
                  <span className="text-stone-700 font-medium">
                    {formatOffDate(entry.date)}
                    {entry.startTime === '00:00' && entry.endTime === '23:59'
                      ? ' · All day'
                      : ` · ${entry.startTime}–${entry.endTime}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-500 hover:text-red-700 font-semibold shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-2 bg-stone-50 border border-stone-100 rounded-xl p-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white"
              required
            />
            <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-stone-300"
              />
              All day unavailable
            </label>
            {!allDay && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white"
                />
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add time off'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function SellerMenuImportReviewModal({
  services,
  importError,
  importing,
  onClose,
  onConfirm,
  onServiceNameChange,
  onVariantChange,
  onRemoveService,
}: SellerMenuImportReviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2rem] shadow-2xl border border-stone-200/60 flex flex-col">
        <div className="p-6 md:p-8 border-b border-stone-200/60">
          <h2 className="text-2xl font-bold text-stone-900 font-display tracking-tight">Review imported services</h2>
          <p className="text-sm text-stone-500 mt-2">
            Edit names, prices, and durations before saving. Existing services with the same name will be skipped.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
          {services.length === 0 ? (
            <p className="text-stone-500 text-center py-8">No services to import.</p>
          ) : (
            services.map((service, serviceIndex) => (
              <div key={`import-${serviceIndex}`} className="rounded-2xl border border-stone-200/60 bg-stone-50/50 p-4 md:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => onServiceNameChange(serviceIndex, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white font-semibold text-stone-900"
                    placeholder="Service name"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveService(serviceIndex)}
                    className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-100 text-sm font-semibold shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  {service.variants.map((variant, variantIndex) => {
                    const styles = getGenderVariantStyles(variant.targetGender);
                    return (
                    <div key={`${serviceIndex}-${variant.targetGender}`} className={`grid grid-cols-3 gap-3 items-center ${styles.row}`}>
                      <div className={`text-xs font-bold border rounded-xl px-3 py-3 text-center ${styles.label}`}>
                        {variant.targetGender}
                      </div>
                      <input
                        type="number"
                        placeholder="Price (Rs)"
                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ${styles.input}`}
                        value={variant.price}
                        onChange={(e) => onVariantChange(serviceIndex, variantIndex, 'price', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Duration (min)"
                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ${styles.input}`}
                        value={variant.duration}
                        onChange={(e) => onVariantChange(serviceIndex, variantIndex, 'duration', e.target.value)}
                      />
                    </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {importError && (
          <div className="px-6 md:px-8 pb-2">
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {importError}
            </div>
          </div>
        )}

        <div className="p-6 md:p-8 border-t border-stone-200/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-6 py-3 rounded-2xl font-bold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={importing || services.length === 0}
            className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {importing ? 'Saving...' : `Import ${services.length} service${services.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SellerStaffForm({
  staffData,
  onSubmit,
  onFieldChange,
}: SellerStaffFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
      <input type="text" placeholder="Staff Name" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={staffData.name} onChange={(e) => onFieldChange('name', e.target.value)} />
      <select
        className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white"
        value={staffData.gender}
        onChange={(e) => onFieldChange('gender', e.target.value)}
      >
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
        <option value="OTHER">Other</option>
      </select>
      <input type="text" placeholder="Skills (comma separated)" className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={staffData.skills} onChange={(e) => onFieldChange('skills', e.target.value)} />
      <button type="submit" className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors mt-2">Add Staff</button>
    </form>
  );
}
