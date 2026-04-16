import { type ChangeEvent, type ComponentType, type FormEvent } from 'react';

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

type StaffData = {
  name: string;
  skills: string;
  gender: string;
};

interface SellerSalonFormProps {
  categories: Category[];
  maxSalonImages: number;
  salonData: SalonData;
  uploadedImages: string[];
  primaryCategory: string | null;
  relatedCategories: string[];
  uploadingImages: boolean;
  salonError: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSalonDataChange: (field: keyof SalonData, value: string) => void;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onPrimaryCategoryChange: (next: string | null) => void;
  onRelatedCategoriesChange: (next: string[]) => void;
  onCancel: () => void;
}

interface SellerServiceFormProps {
  serviceData: ServiceData;
  serviceError: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onVariantChange: (index: number, field: 'price' | 'duration', value: string) => void;
}

interface SellerStaffFormProps {
  staffData: StaffData;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof StaffData, value: string) => void;
}

export function SellerSalonForm({
  categories,
  maxSalonImages,
  salonData,
  uploadedImages,
  primaryCategory,
  relatedCategories,
  uploadingImages,
  salonError,
  onSubmit,
  onSalonDataChange,
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
  onSubmit,
  onNameChange,
  onVariantChange,
}: SellerServiceFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-200/60">
      <input type="text" placeholder="Service Name" required className="w-full px-5 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white" value={serviceData.name} onChange={(e) => onNameChange(e.target.value)} />
      <div className="space-y-3">
        {serviceData.variants.map((variant, index) => (
          <div key={variant.targetGender} className="grid grid-cols-3 gap-3 items-center">
            <div className="text-xs font-bold text-stone-500 bg-white border border-stone-200 rounded-xl px-3 py-3 text-center">
              {variant.targetGender}
            </div>
            <input
              type="number"
              placeholder="Price (Rs)"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white"
              value={variant.price}
              onChange={(e) => onVariantChange(index, 'price', e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (min)"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900 bg-white"
              value={variant.duration}
              onChange={(e) => onVariantChange(index, 'duration', e.target.value)}
            />
          </div>
        ))}
      </div>
      {serviceError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {serviceError}
        </div>
      )}
      <button type="submit" className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition-colors mt-2">Add Service</button>
    </form>
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
