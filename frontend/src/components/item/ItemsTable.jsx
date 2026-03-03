import { useState } from 'react';
import { Link } from 'react-router-dom';
import ItemForm from './ItemForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemsApi } from '../../services/api';
import { format } from 'date-fns';

export default function ItemsTable({ inventory, canWrite, canEdit }) {
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['items', inventory.id, page],
    queryFn: () => itemsApi.list(inventory.id, { page, pageSize: 25 })
  });

  const deleteMut = useMutation({
    mutationFn: (itemId) => itemsApi.delete(inventory.id, itemId),
    onSuccess: () => { toast.success('Item deleted'); qc.invalidateQueries(['items', inventory.id]); }
  });

  const fields = inventory.fields;

  // Build column list from defined fields
  const columns = [
    { key: 'customId', label: 'ID' },
    ...(fields.string1 ? [{ key: 'string1', label: fields.string1, dtype: 'string' }] : []),
    ...(fields.string2 ? [{ key: 'string2', label: fields.string2, dtype: 'string' }] : []),
    ...(fields.string3 ? [{ key: 'string3', label: fields.string3, dtype: 'string' }] : []),
    ...(fields.text1 ? [{ key: 'text1', label: fields.text1, dtype: 'text' }] : []),
    ...(fields.text2 ? [{ key: 'text2', label: fields.text2, dtype: 'text' }] : []),
    ...(fields.text3 ? [{ key: 'text3', label: fields.text3, dtype: 'text' }] : []),
    ...(fields.number1 ? [{ key: 'number1', label: fields.number1, dtype: 'number' }] : []),
    ...(fields.number2 ? [{ key: 'number2', label: fields.number2, dtype: 'number' }] : []),
    ...(fields.number3 ? [{ key: 'number3', label: fields.number3, dtype: 'number' }] : []),
    ...(fields.link1 ? [{ key: 'link1', label: fields.link1, dtype: 'link' }] : []),
    ...(fields.link2 ? [{ key: 'link2', label: fields.link2, dtype: 'link' }] : []),
    ...(fields.link3 ? [{ key: 'link3', label: fields.link3, dtype: 'link' }] : []),
    ...(fields.bool1 ? [{ key: 'bool1', label: fields.bool1, dtype: 'bool' }] : []),
    ...(fields.bool2 ? [{ key: 'bool2', label: fields.bool2, dtype: 'bool' }] : []),
    ...(fields.bool3 ? [{ key: 'bool3', label: fields.bool3, dtype: 'bool' }] : []),
    { key: 'createdAt', label: 'Created' },
  ];

  const getCellValue = (item, col) => {
    const map = {
      customId: item.customId,
      string1: item.string1, string2: item.string2, string3: item.string3,
      text1: item.text1, text2: item.text2, text3: item.text3,
      number1: item.number1, number2: item.number2, number3: item.number3,
      link1: item.link1, link2: item.link2, link3: item.link3,
      bool1: item.bool1, bool2: item.bool2, bool3: item.bool3,
      createdAt: item.createdAt,
    };
    return map[col.key];
  };

  const renderCell = (value, col) => {
    if (value === null || value === undefined) return <span className="text-slate-300">—</span>;
    if (col.key === 'customId') return <span className="custom-id">{value}</span>;
    if (col.dtype === 'bool') return value ? <span className="badge-green">✓ Yes</span> : <span className="badge-gray">✗ No</span>;
    if (col.dtype === 'link') return <a href={value} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs truncate max-w-[150px] block">{value}</a>;
    if (col.dtype === 'number') return <span className="font-mono">{value}</span>;
    if (col.dtype === 'text') return <span className="line-clamp-1 text-slate-600 max-w-[200px]">{value}</span>;
    if (col.key === 'createdAt') return <span className="text-xs text-slate-400">{format(new Date(value), 'MMM d, yyyy')}</span>;
    return <span>{value}</span>;
  };

  const pageCount = data ? Math.ceil(data.total / 25) : 0;

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {data?.items?.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No items yet</p>
          {canWrite && <p className="text-sm">Click "Add Item" to get started</p>}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map(item => (
                <tr key={item.id}>
                  {columns.map(col => (
                    <td key={col.key}>{renderCell(getCellValue(item, col), col)}</td>
                  ))}
                  <td>
                    {/* Row actions - appear on hover */}
                    <div className="row-actions flex items-center gap-1">
                      <Link to={`/inventories/${inventory.id}/items/${item.id}`}
                        className="btn-icon" title="View">
                        <Eye size={14} />
                      </Link>
                      {canWrite && (
                        <button onClick={() => setEditingItem(item)} className="btn-icon" title="Edit">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => { if (confirm('Delete item?')) deleteMut.mutate(item.id); }}
                          className="btn-icon text-red-400 hover:text-red-600" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-icon">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="btn-icon">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setEditingItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in p-6">
            <h2 className="font-display font-bold text-xl mb-4">Edit Item</h2>
            <ItemForm inventoryId={inventory.id} inv={inventory} item={editingItem}
              onSuccess={() => { setEditingItem(null); qc.invalidateQueries(['items', inventory.id]); }}
              onCancel={() => setEditingItem(null)} />
          </div>
        </div>
      )}
    </div>
  );
}