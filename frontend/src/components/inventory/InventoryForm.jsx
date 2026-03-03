import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Save, Upload, X } from 'lucide-react';
import { inventoriesApi } from '../../services/api';
import CustomIdBuilder from './CustomIdBuilder';

const FIELD_TYPES = [
  { key: 'String', label: 'String', count: 3 },
  { key: 'Text', label: 'Text (long)', count: 3 },
  { key: 'Number', label: 'Number', count: 3 },
  { key: 'Link', label: 'Link (URL)', count: 3 },
  { key: 'Bool', label: 'Boolean', count: 3 },
];

export default function InventoryForm({ inventory }) {
  const navigate = useNavigate();
  const isEdit = !!inventory;

  const [customIdFormat, setCustomIdFormat] = useState(inventory?.customIdFormat || '[]');
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(inventory?.imageUrl || '');

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: inventory?.title || '',
      description: inventory?.description || '',
      category: inventory?.category || '',
      tags: inventory?.tags || '',
      isPublic: inventory?.isPublic || false,
      // Fields
      String1: inventory?.fields?.string1 || '',
      String2: inventory?.fields?.string2 || '',
      String3: inventory?.fields?.string3 || '',
      Text1: inventory?.fields?.text1 || '',
      Text2: inventory?.fields?.text2 || '',
      Text3: inventory?.fields?.text3 || '',
      Number1: inventory?.fields?.number1 || '',
      Number2: inventory?.fields?.number2 || '',
      Number3: inventory?.fields?.number3 || '',
      Link1: inventory?.fields?.link1 || '',
      Link2: inventory?.fields?.link2 || '',
      Link3: inventory?.fields?.link3 || '',
      Bool1: inventory?.fields?.bool1 || '',
      Bool2: inventory?.fields?.bool2 || '',
      Bool3: inventory?.fields?.bool3 || '',
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await inventoriesApi.uploadImage(file);
      setImageUrl(url);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags,
      isPublic: data.isPublic,
      imageUrl,
      customIdFormat,
      fields: {
        string1: data.String1 || null, string2: data.String2 || null, string3: data.String3 || null,
        text1: data.Text1 || null, text2: data.Text2 || null, text3: data.Text3 || null,
        number1: data.Number1 || null, number2: data.Number2 || null, number3: data.Number3 || null,
        link1: data.Link1 || null, link2: data.Link2 || null, link3: data.Link3 || null,
        bool1: data.Bool1 || null, bool2: data.Bool2 || null, bool3: data.Bool3 || null,
      }
    };

    try {
      if (isEdit) {
        await inventoriesApi.update(inventory.id, payload);
        toast.success('Inventory updated!');
        navigate(`/inventories/${inventory.id}`);
      } else {
        const { id } = await inventoriesApi.create(payload);
        toast.success('Inventory created!');
        navigate(`/inventories/${id}`);
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Inventory' : 'New Inventory'}</h1>
      </div>

      {/* Basic info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">General</h2>
        <div>
          <label className="label">Title *</label>
          <input {...register('title', { required: true })} className="input" placeholder="My Inventory" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} rows={3} className="input" placeholder="What is this inventory about?" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <input {...register('category')} className="input" placeholder="e.g. Books, Equipment" />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input {...register('tags')} className="input" placeholder="books, library, fiction" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isPublic" {...register('isPublic')} className="w-4 h-4 accent-brand-600" />
          <label htmlFor="isPublic" className="text-sm text-slate-700">
            Public — all authenticated users can add items
          </label>
        </div>
        {/* Image upload */}
        <div>
          <label className="label">Cover Image (optional)</label>
          <div className="flex items-center gap-3">
            {imageUrl && <img src={imageUrl} className="w-20 h-20 object-cover rounded-lg border" alt="cover" />}
            <label className={`btn-secondary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
            {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="btn-ghost text-red-500"><X size={15} /></button>}
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Custom Fields</h2>
        <p className="text-sm text-slate-500">Define up to 3 fields of each type. Leave blank to hide.</p>
        {FIELD_TYPES.map(({ key, label, count }) => (
          <div key={key}>
            <p className="text-sm font-medium text-slate-700 mb-2">{label} fields</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: count }, (_, i) => (
                <input key={i} {...register(`${key}${i + 1}`)} className="input"
                  placeholder={`${label} ${i + 1} name`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom ID Format */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Custom Item Numbers (ID)</h2>
        <p className="text-sm text-slate-500">Configure how item IDs are generated.</p>
        <CustomIdBuilder value={customIdFormat} onChange={setCustomIdFormat} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Inventory'}
        </button>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
