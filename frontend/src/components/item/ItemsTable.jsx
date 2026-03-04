import { useState } from 'react';
import { Link } from 'react-router-dom';
import ItemForm from './ItemForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Info } from 'lucide-react';
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

  // Build column list from defined fields that showInTable
  const columns = [
    { key: 'customId', label: 'ID' },
    ...([1, 2, 3].filter(n => fields?.[`str${n}`]?.name && fields?.[`str${n}`]?.show).map(n => ({ key: `string${n}`, label: fields[`str${n}`].name, dtype: 'string', desc: fields[`str${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`txt${n}`]?.name && fields?.[`txt${n}`]?.show).map(n => ({ key: `text${n}`, label: fields[`txt${n}`].name, dtype: 'text', desc: fields[`txt${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`num${n}`]?.name && fields?.[`num${n}`]?.show).map(n => ({ key: `number${n}`, label: fields[`num${n}`].name, dtype: 'number', desc: fields[`num${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`lnk${n}`]?.name && fields?.[`lnk${n}`]?.show).map(n => ({ key: `link${n}`, label: fields[`lnk${n}`].name, dtype: 'link', desc: fields[`lnk${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`bol${n}`]?.name && fields?.[`bol${n}`]?.show).map(n => ({ key: `bool${n}`, label: fields[`bol${n}`].name, dtype: 'bool', desc: fields[`bol${n}`].desc }))),
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
    if (value === null || value === undefined) return <span className="text-slate-300 dark:text-slate-600">—</span>;
    if (col.key === 'customId') return <span className="custom-id">{value}</span>;
    if (col.dtype === 'bool') return value ? <span className="badge-green">✓ Yes</span> : <span className="badge-gray">✗ No</span>;
    if (col.dtype === 'link') return <a href={value} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline text-xs truncate max-w-[150px] block">{value}</a>;
    if (col.dtype === 'number') return <span className="font-mono">{value}</span>;
    if (col.dtype === 'text') return <span className="line-clamp-1 text-slate-600 dark:text-slate-400 max-w-[200px]">{value}</span>;
    if (col.key === 'createdAt') return <span className="text-xs text-slate-400">{format(new Date(value), 'MMM d, yyyy')}</span>;
    return <span className="dark:text-slate-300">{value}</span>;
  };

  const pageCount = data ? Math.ceil(data.total / 25) : 0;

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {data?.items?.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg mb-2">No items yet</p>
          {canWrite && <p className="text-sm">Click "Add Item" to get started</p>}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>
                    <div className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                      {col.label}
                      {col.desc && (
                        <div className="group relative flex items-center">
                          <Info size={13} className="text-slate-400 cursor-help" />
                          <div className="absolute left-full ml-2 w-48 p-2 bg-slate-800 text-xs text-white rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none z-10 font-normal normal-case before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-slate-800">
                            {col.desc}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
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
                          className="btn-icon text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
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
          <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="btn-icon">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setEditingItem(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in p-6">
            <h2 className="font-display font-bold text-xl mb-4 dark:text-white">Edit Item</h2>
            <ItemForm inventoryId={inventory.id} inv={inventory} item={editingItem}
              onSuccess={() => { setEditingItem(null); qc.invalidateQueries(['items', inventory.id]); }}
              onCancel={() => setEditingItem(null)} />
          </div>
        </div>
      )}
    </div>
  );
}