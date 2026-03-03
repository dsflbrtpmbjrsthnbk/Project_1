import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { itemsApi } from '../../services/api';

export default function ItemForm({ inventoryId, inv, item, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const fields = inv.fields;

  const defaultValues = isEdit ? {
    String1: item.string1 || '', String2: item.string2 || '', String3: item.string3 || '',
    Text1: item.text1 || '', Text2: item.text2 || '', Text3: item.text3 || '',
    Number1: item.number1 ?? '', Number2: item.number2 ?? '', Number3: item.number3 ?? '',
    Link1: item.link1 || '', Link2: item.link2 || '', Link3: item.link3 || '',
    Bool1: item.bool1 ?? false, Bool2: item.bool2 ?? false, Bool3: item.bool3 ?? false,
  } : {};

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues });

  const onSubmit = async (data) => {
    const payload = {
      string1: data.String1 || null, string2: data.String2 || null, string3: data.String3 || null,
      text1: data.Text1 || null, text2: data.Text2 || null, text3: data.Text3 || null,
      number1: data.Number1 !== '' ? Number(data.Number1) : null,
      number2: data.Number2 !== '' ? Number(data.Number2) : null,
      number3: data.Number3 !== '' ? Number(data.Number3) : null,
      link1: data.Link1 || null, link2: data.Link2 || null, link3: data.Link3 || null,
      bool1: data.Bool1, bool2: data.Bool2, bool3: data.Bool3,
    };

    try {
      if (isEdit) {
        payload.rowVersion = btoa(String.fromCharCode(...item.rowVersion || []));
        await itemsApi.update(inventoryId, item.id, payload);
        toast.success('Item updated!');
      } else {
        await itemsApi.create(inventoryId, payload);
        toast.success('Item added!');
      }
      qc.invalidateQueries(['items', inventoryId]);
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 409) toast.error('Conflict: item was modified by someone else. Please refresh.');
      else toast.error('Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* String fields */}
      {[1, 2, 3].map(n => fields[`string${n}`] && (
        <div key={`s${n}`}>
          <label className="label">{fields[`string${n}`]}</label>
          <input {...register(`String${n}`)} className="input" />
        </div>
      ))}

      {/* Text fields */}
      {[1, 2, 3].map(n => fields[`text${n}`] && (
        <div key={`t${n}`}>
          <label className="label">{fields[`text${n}`]}</label>
          <textarea {...register(`Text${n}`)} rows={3} className="input" />
        </div>
      ))}

      {/* Number fields */}
      {[1, 2, 3].map(n => fields[`number${n}`] && (
        <div key={`n${n}`}>
          <label className="label">{fields[`number${n}`]}</label>
          <input type="number" step="any" {...register(`Number${n}`)} className="input" />
        </div>
      ))}

      {/* Link fields */}
      {[1, 2, 3].map(n => fields[`link${n}`] && (
        <div key={`l${n}`}>
          <label className="label">{fields[`link${n}`]}</label>
          <input type="url" {...register(`Link${n}`)} className="input" placeholder="https://" />
        </div>
      ))}

      {/* Bool fields */}
      {[1, 2, 3].map(n => fields[`bool${n}`] && (
        <div key={`b${n}`} className="flex items-center gap-2">
          <input type="checkbox" id={`Bool${n}`} {...register(`Bool${n}`)} className="w-4 h-4 accent-brand-600" />
          <label htmlFor={`Bool${n}`} className="text-sm font-medium text-slate-700">{fields[`bool${n}`]}</label>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          <Save size={15} /> {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add Item'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
