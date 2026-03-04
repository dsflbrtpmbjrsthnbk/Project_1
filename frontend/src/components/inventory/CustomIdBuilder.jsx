import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';

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

function SortableItem({ id, el, index, updateElement, removeElement }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div {...attributes} {...listeners} className="cursor-grab hover:text-brand-600">
        <GripVertical size={16} className="text-slate-300 dark:text-slate-500 shrink-0" />
      </div>
      <select value={el.type} onChange={e => updateElement(index, { type: e.target.value })}
        className="input w-36 shrink-0">
        {ELEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input value={el.value || ''} onChange={e => updateElement(index, { value: e.target.value })}
        placeholder={ELEMENT_TYPES.find(t => t.value === el.type)?.desc}
        className="input flex-1 font-mono" />
      <button type="button" onClick={() => removeElement(index)} className="btn-icon text-red-400 hover:text-red-600">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function CustomIdBuilder({ value, onChange }) {
  const { t } = useTranslation();
  const [elements, setElements] = useState(() => {
    try {
      const parsed = JSON.parse(value || '[]');
      return parsed.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9) }));
    } catch {
      return [];
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const update = (newElements) => {
    setElements(newElements);
    onChange(JSON.stringify(newElements.map(({ type, value }) => ({ type, value }))));
  };

  const addElement = () => update([...elements, { id: Math.random().toString(), type: 'fixed', value: '' }]);

  const updateElement = (i, changes) => {
    const next = [...elements];
    next[i] = { ...next[i], ...changes };
    if (changes.type) next[i].value = ELEMENT_TYPES.find(t => t.value === changes.type)?.defaultValue || '';
    update(next);
  };

  const removeElement = (i) => update(elements.filter((_, idx) => idx !== i));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = elements.findIndex(el => el.id === active.id);
      const newIndex = elements.findIndex(el => el.id === over.id);
      update(arrayMove(elements, oldIndex, newIndex));
    }
  };

  const preview = elements.length > 0 ? generatePreview(elements) : 'ITEM-A3F8B_001_2025';

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Preview</p>
        <code className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">{preview}</code>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {elements.map((el, i) => (
              <SortableItem key={el.id} id={el.id} el={el} index={i} updateElement={updateElement} removeElement={removeElement} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" onClick={addElement} className="btn-secondary w-full">
        <Plus size={15} /> Add element
      </button>

      <p className="text-xs text-slate-400">
        Examples: Fixed "📚-" + Random "X5_" + Sequence "D3_" + Date "yyyy" → 📚-A7E3A_013_2025
      </p>
    </div>
  );
}
