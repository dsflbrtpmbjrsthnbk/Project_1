import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Plus, Download, BarChart2, Settings, Users, Hash, Eye, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoriesApi, itemsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ItemsTable from '../components/item/ItemsTable';
import ItemForm from '../components/item/ItemForm';
import InventoryStats from '../components/inventory/InventoryStats';
import AccessManager from '../components/inventory/AccessManager';
import InventoryForm from '../components/inventory/InventoryForm';
import CustomIdBuilder from '../components/inventory/CustomIdBuilder';
import InventoryDiscussion from '../components/inventory/InventoryDiscussion';
import { format } from 'date-fns';

const TABS = [
  { id: 'items', label: 'Items', icon: Eye },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'customid', label: 'Custom ID', icon: Hash },
  { id: 'access', label: 'Access', icon: Users },
  { id: 'stats', label: 'Statistics', icon: BarChart2 },
];

export default function InventoryPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('items');
  const [showAddItem, setShowAddItem] = useState(false);

  const { data: inv, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoriesApi.get(Number(id))
  });

  const deleteMut = useMutation({
    mutationFn: () => inventoriesApi.delete(Number(id)),
    onSuccess: () => { toast.success('Inventory deleted'); navigate('/inventories'); }
  });

  const exportCsv = async () => {
    const blob = await inventoriesApi.exportCsv(Number(id));
    const url = URL.createObjectURL(blob.data);
    const a = document.createElement('a'); a.href = url;
    a.download = `inventory-${id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!inv) return <div className="text-center py-20 text-slate-500">Inventory not found</div>;

  const visibleTabs = TABS.filter(t => {
    if (['settings', 'customid', 'access'].includes(t.id)) return inv.canEdit;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {inv.imageUrl && (
          <img src={inv.imageUrl} alt={inv.title} className="w-20 h-20 object-cover rounded-xl border" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title mb-0">{inv.title}</h1>
            {inv.isPublic ? <span className="badge-green">Public</span> : <span className="badge-gray">Private</span>}
          </div>
          <p className="text-slate-500 text-sm mb-2">{inv.description}</p>
          <div className="flex flex-wrap gap-1">
            {inv.tags.split(',').filter(Boolean).map(tag => (
              <span key={tag} className="badge-gray">{tag.trim()}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {inv.canEdit && (
            <>
              <button onClick={exportCsv} className="btn-secondary">
                <Download size={15} /> Export
              </button>
              <button onClick={() => { if (confirm('Delete this inventory?')) deleteMut.mutate(); }}
                className="btn-danger">
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
          {inv.canWrite && (
            <button onClick={() => setShowAddItem(true)} className="btn-primary">
              <Plus size={15} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {visibleTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab flex items-center gap-1.5 ${tab === t.id ? 'active' : ''}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'items' && (
        <ItemsTable inventory={inv} canWrite={inv.canWrite} canEdit={inv.canEdit} />
      )}
      {tab === 'discussion' && (
        <div className="flex justify-center">
          <InventoryDiscussion inventoryId={Number(id)} />
        </div>
      )}
      {tab === 'settings' && inv.canEdit && (
        <InventoryForm inventory={inv} />
      )}
      {tab === 'customid' && inv.canEdit && (
        <div className="max-w-xl card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Custom ID Format</h2>
          <CustomIdBuilder value={inv.customIdFormat} onChange={async (fmt) => {
            await inventoriesApi.update(Number(id), { ...inv, customIdFormat: fmt, fields: inv.fields });
            qc.invalidateQueries(['inventory', id]);
            toast.success('Saved');
          }} />
        </div>
      )}
      {tab === 'access' && inv.canEdit && (
        <AccessManager inventoryId={Number(id)} />
      )}
      {tab === 'stats' && (
        <InventoryStats inventoryId={Number(id)} />
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <ItemFormModal inventoryId={Number(id)} inv={inv} onClose={() => { setShowAddItem(false); qc.invalidateQueries(['items', id]); }} />
      )}
    </div>
  );
}

function ItemFormModal({ inventoryId, inv, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6">
          <h2 className="font-display font-bold text-xl mb-4">Add Item</h2>
          <ItemForm inventoryId={inventoryId} inv={inv} onSuccess={onClose} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
