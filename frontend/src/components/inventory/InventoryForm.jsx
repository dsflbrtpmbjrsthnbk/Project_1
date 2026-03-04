import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Upload, X, CheckCircle, RefreshCw } from 'lucide-react';
import { inventoriesApi } from '../../services/api';
import CustomIdBuilder from './CustomIdBuilder';
import TagsInput from './TagsInput';

const FIELD_TYPES = [
  { key: 'String', label: 'String', count: 3 },
  { key: 'Text', label: 'Text (long)', count: 3 },
  { key: 'Number', label: 'Number', count: 3 },
  { key: 'Link', label: 'Link (URL)', count: 3 },
  { key: 'Bool', label: 'Boolean', count: 3 },
];

export default function InventoryForm({ inventory }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!inventory;

  const [customIdFormat, setCustomIdFormat] = useState(inventory?.customIdFormat || '[]');
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(inventory?.imageUrl || '');
  const [version, setVersion] = useState(inventory?.version || 0);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  const defaultValues = {
    title: inventory?.title || '',
    description: inventory?.description || '',
    category: inventory?.category || '',
    tags: inventory?.tags || '',
    isPublic: inventory?.isPublic || false,
    String1: inventory?.fields?.str1?.name || '',
    String2: inventory?.fields?.str2?.name || '',
    String3: inventory?.fields?.str3?.name || '',
    Text1: inventory?.fields?.txt1?.name || '',
    Text2: inventory?.fields?.txt2?.name || '',
    Text3: inventory?.fields?.txt3?.name || '',
    Number1: inventory?.fields?.num1?.name || '',
    Number2: inventory?.fields?.num2?.name || '',
    Number3: inventory?.fields?.num3?.name || '',
    Link1: inventory?.fields?.lnk1?.name || '',
    Link2: inventory?.fields?.lnk2?.name || '',
    Link3: inventory?.fields?.lnk3?.name || '',
    Bool1: inventory?.fields?.bol1?.name || '',
    Bool2: inventory?.fields?.bol2?.name || '',
    Bool3: inventory?.fields?.bol3?.name || '',
  };

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues });

  const formValues = watch();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const formValuesRef = useRef(formValues);
  formValuesRef.current = formValues;
  const versionRef = useRef(version);
  versionRef.current = version;
  const imageUrlRef = useRef(imageUrl);
  imageUrlRef.current = imageUrl;
  const customIdFormatRef = useRef(customIdFormat);
  customIdFormatRef.current = customIdFormat;

  // Auto-save every 8 seconds if dirty and editing
  useEffect(() => {
    if (!isEdit) return;
    const interval = setInterval(async () => {
      // Check if fields, customIdFormat, or imageUrl changed from initial
      const hasChanges = isDirtyRef.current ||
        imageUrlRef.current !== (inventory?.imageUrl || '') ||
        customIdFormatRef.current !== (inventory?.customIdFormat || '[]');

      if (hasChanges) {
        setAutoSaveStatus('saving');
        const data = formValuesRef.current;
        const payload = {
          title: data.title,
          description: data.description,
          category: data.category,
          tags: data.tags,
          isPublic: data.isPublic,
          imageUrl: imageUrlRef.current,
          customIdFormat: customIdFormatRef.current,
          version: versionRef.current,
          fields: {
            string1: data.String1 || null, string2: data.String2 || null, string3: data.String3 || null,
            text1: data.Text1 || null, text2: data.Text2 || null, text3: data.Text3 || null,
            number1: data.Number1 || null, number2: data.Number2 || null, number3: data.Number3 || null,
            link1: data.Link1 || null, link2: data.Link2 || null, link3: data.Link3 || null,
            bool1: data.Bool1 || null, bool2: data.Bool2 || null, bool3: data.Bool3 || null,
            // Keep existing visibility/desc rules for now (assuming true/null)
            string1Show: true, string2Show: true, string3Show: true,
            text1Show: true, text2Show: true, text3Show: true,
            number1Show: true, number2Show: true, number3Show: true,
            link1Show: true, link2Show: true, link3Show: true,
            bool1Show: true, bool2Show: true, bool3Show: true,
          }
        };

        try {
          const res = await inventoriesApi.update(inventory.id, payload);
          setVersion(res.version);
          reset(data); // Resets isDirty to false with current values
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus(''), 3000);
          qc.invalidateQueries(['inventory', inventory.id]);
        } catch (err) {
          if (err.response?.status === 409) {
            toast.error('Conflict: Data modified elsewhere. Please refresh.');
            setAutoSaveStatus('error');
            clearInterval(interval);
          }
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isEdit, inventory, reset, qc]);

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
      version,
      fields: {
        string1: data.String1 || null, string2: data.String2 || null, string3: data.String3 || null,
        text1: data.Text1 || null, text2: data.Text2 || null, text3: data.Text3 || null,
        number1: data.Number1 || null, number2: data.Number2 || null, number3: data.Number3 || null,
        link1: data.Link1 || null, link2: data.Link2 || null, link3: data.Link3 || null,
        bool1: data.Bool1 || null, bool2: data.Bool2 || null, bool3: data.Bool3 || null,
        string1Show: true, string2Show: true, string3Show: true,
        text1Show: true, text2Show: true, text3Show: true,
        number1Show: true, number2Show: true, number3Show: true,
        link1Show: true, link2Show: true, link3Show: true,
        bool1Show: true, bool2Show: true, bool3Show: true,
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
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Conflict: Data modified elsewhere. Please refresh.');
      } else {
        toast.error('Something went wrong');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between page-header mb-6">
        <h1 className="page-title dark:text-white">{isEdit ? 'Edit Inventory' : 'New Inventory'}</h1>

        {/* Auto-save indicator */}
        {isEdit && autoSaveStatus && (
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${autoSaveStatus === 'saving' ? 'bg-slate-100 text-slate-500' : autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {autoSaveStatus === 'saving' && <RefreshCw size={14} className="animate-spin" />}
            {autoSaveStatus === 'saved' && <CheckCircle size={14} />}
            {autoSaveStatus === 'error' && <X size={14} />}
            {autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'saved' ? 'All changes saved' : 'Save conflict'}
          </div>
        )}
      </div>

      {/* Basic info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">General</h2>
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
            <label className="label">Tags</label>
            <TagsInput value={watch('tags')} onChange={(val) => setValue('tags', val, { shouldDirty: true, shouldTouch: true })} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isPublic" {...register('isPublic')} className="w-4 h-4 accent-brand-600" />
          <label htmlFor="isPublic" className="text-sm text-slate-700 dark:text-slate-300">
            Public — all authenticated users can add items
          </label>
        </div>
        {/* Image upload */}
        <div>
          <label className="label">Cover Image (optional)</label>
          <div className="flex items-center gap-3">
            {imageUrl && <img src={imageUrl} className="w-20 h-20 object-cover rounded-lg border dark:border-slate-700" alt="cover" />}
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
        <h2 className="font-semibold text-slate-900 dark:text-white">Custom Fields</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Define up to 3 fields of each type. Leave blank to hide.</p>
        <div className="space-y-4">
          {FIELD_TYPES.map(({ key, label, count }) => (
            <div key={key}>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label} fields</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: count }, (_, i) => (
                  <input key={i} {...register(`${key}${i + 1}`)} className="input"
                    placeholder={`${label} ${i + 1} name`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom ID Format */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Custom Item Numbers (ID)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure how item IDs are generated.</p>
        <CustomIdBuilder value={customIdFormat} onChange={setCustomIdFormat} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          <Save size={16} /> {isSubmitting ? 'Saving...' : (isEdit ? 'Save Inventory' : 'Create Inventory')}
        </button>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
