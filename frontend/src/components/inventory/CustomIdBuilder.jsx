import { useState } from 'react';
import { Plus, Trash2, GripVertical, Smile } from 'lucide-react';

const ELEMENT_TYPES = [
  { value: 'fixed', label: 'Fixed', desc: 'Fixed text or emoji', defaultValue: '📦-' },
  { value: 'random', label: 'Random', desc: 'Random value (e.g., X5 = 5 hex chars, D6 = 6 digits)', defaultValue: 'X5' },
  { value: 'sequence', label: 'Sequence', desc: 'Sequential index (e.g., D3 = 3 digits with leading zeros)', defaultValue: 'D3' },
  { value: 'datetime', label: 'Date/time', desc: 'Date component (yyyy, yy, MM, dd, ddd)', defaultValue: 'yyyy' },
];

function generatePreview(elements) {
  return elements.map(el => {
    switch (el.type) {
      case 'fixed': return el.value || '';
      case 'random': {
        const fmt = el.value || 'X5';
        const len = parseInt(fmt.slice(1)) || 5;
        const isHex = fmt[0] === 'X' || fmt[0] === 'x';
        return isHex
          ? Array.from({ length: len }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')
          : Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
      }
      case 'sequence': {
        const fmt = el.value || 'D3';
        const len = parseInt(fmt.slice(1)) || 3;
        return '1'.padStart(len, '0');
      }
      case 'datetime': {
        const now = new Date();
        const fmt = el.value || 'yyyy';
        if (fmt === 'yyyy') return now.getFullYear().toString();
        if (fmt === 'yy') return now.getFullYear().toString().slice(-2);
        if (fmt === 'MM') return String(now.getMonth() + 1).padStart(2, '0');
        if (fmt === 'dd') return String(now.getDate()).padStart(2, '0');
        return now.getFullYear().toString();
      }
      default: return '';
    }
  }).join('');
}

export default function CustomIdBuilder({ value, onChange }) {
  const elements = (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })();

  const update = (newElements) => onChange(JSON.stringify(newElements));

  const addElement = () => update([...elements, { type: 'fixed', value: '' }]);

  const updateElement = (i, changes) => {
    const next = [...elements];
    next[i] = { ...next[i], ...changes };
    if (changes.type) next[i].value = ELEMENT_TYPES.find(t => t.value === changes.type)?.defaultValue || '';
    update(next);
  };

  const removeElement = (i) => update(elements.filter((_, idx) => idx !== i));

  const preview = elements.length > 0 ? generatePreview(elements) : 'ITEM-A3F8B_001_2025';

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <p className="text-xs text-slate-500 mb-1">Preview</p>
        <code className="text-lg font-mono font-bold text-slate-800">{preview}</code>
      </div>

      <div className="space-y-2">
        {elements.map((el, i) => (
          <div key={i} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg animate-fade-in">
            <GripVertical size={16} className="text-slate-300 shrink-0" />
            <select value={el.type} onChange={e => updateElement(i, { type: e.target.value })}
              className="input w-36 shrink-0">
              {ELEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={el.value || ''} onChange={e => updateElement(i, { value: e.target.value })}
              placeholder={ELEMENT_TYPES.find(t => t.value === el.type)?.desc}
              className="input flex-1 font-mono" />
            <button onClick={() => removeElement(i)} className="btn-icon text-red-400 hover:text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addElement} className="btn-secondary w-full">
        <Plus size={15} /> Add element
      </button>

      <p className="text-xs text-slate-400">
        Examples: Fixed "📚-" + Random "X5_" + Sequence "D3_" + Date "yyyy" → 📚-A7E3A_013_2025
      </p>
    </div>
  );
}
