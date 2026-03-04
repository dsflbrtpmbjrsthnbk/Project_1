import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Info } from 'lucide-react';
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

  const renderLabel = (fieldDef) => (
    <div className="flex items-center gap-1.5 label mb-1">
      {fieldDef.name}
      {fieldDef.desc && (
        <div className="group relative flex items-center">
          <Info size={14} className="text-slate-400 hover:text-brand-500 cursor-help transition-colors" />
          <div className="absolute left-full ml-2 w-48 p-2 bg-slate-800 text-xs text-white rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none z-10 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-slate-800">
            {fieldDef.desc}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* String fields */}
      {[1, 2, 3].map(n => fields[`str${n}`]?.name && (
        <div key={`s${n}`}>
          {renderLabel(fields[`str${n}`])}
          <input {...register(`String${n}`)} className="input" />
        </div>
      ))}

      {/* Text fields */}
      {[1, 2, 3].map(n => fields[`txt${n}`]?.name && (
        <div key={`t${n}`}>
          {renderLabel(fields[`txt${n}`])}
          <textarea {...register(`Text${n}`)} rows={3} className="input" />
        </div>
      ))}

      {/* Number fields */}
      {[1, 2, 3].map(n => fields[`num${n}`]?.name && (
        <div key={`n${n}`}>
          {renderLabel(fields[`num${n}`])}
          <input type="number" step="any" {...register(`Number${n}`)} className="input" />
        </div>
      ))}

      {/* Link fields */}
      {[1, 2, 3].map(n => fields[`lnk${n}`]?.name && (
        <div key={`l${n}`}>
          {renderLabel(fields[`lnk${n}`])}
          <input type="url" {...register(`Link${n}`)} className="input" placeholder="https://" />
        </div>
      ))}

      {/* Bool fields */}
      {[1, 2, 3].map(n => fields[`bol${n}`]?.name && (
        <div key={`b${n}`} className="flex items-center gap-2">
          <input type="checkbox" id={`Bool${n}`} {...register(`Bool${n}`)} className="w-4 h-4 accent-brand-600" />
          {renderLabel(fields[`bol${n}`])}
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
