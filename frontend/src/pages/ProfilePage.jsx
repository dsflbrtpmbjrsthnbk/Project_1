import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package } from 'lucide-react';
import { inventoriesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const isMe = user?.id === userId;
  const [sortOwned, setSortOwned] = useState('');
  const [sortAccess, setSortAccess] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['userInventories', userId],
    queryFn: () => inventoriesApi.userInventories(userId)
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  const sort = (list, key) => {
    if (!key) return list;
    return [...list].sort((a, b) => {
      if (key === 'title') return a.title.localeCompare(b.title);
      if (key === 'items') return b.itemCount - a.itemCount;
      if (key === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-600">
          {user?.displayName?.[0] || '?'}
        </div>
        <div>
          <h1 className="page-title mb-0">{isMe ? 'My Profile' : 'User Profile'}</h1>
          <p className="text-slate-500">{user?.email}</p>
        </div>
        {isMe && (
          <Link to="/inventories/new" className="btn-primary ml-auto">
            <Plus size={16} /> New Inventory
          </Link>
        )}
      </div>

      {/* Owned inventories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-slate-900">
            {isMe ? 'My Inventories' : 'Owned Inventories'} ({data?.owned?.length ?? 0})
          </h2>
          <select value={sortOwned} onChange={e => setSortOwned(e.target.value)} className="input w-36">
            <option value="">Sort by...</option>
            <option value="title">Title</option>
            <option value="items">Items</option>
            <option value="date">Date</option>
          </select>
        </div>
        <InventoryTable items={sort(data?.owned || [], sortOwned)} showDelete={isMe} />
      </section>

      {/* Write access inventories */}
      {data?.withAccess?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-slate-900">
              Inventories with write access ({data.withAccess.length})
            </h2>
            <select value={sortAccess} onChange={e => setSortAccess(e.target.value)} className="input w-36">
              <option value="">Sort by...</option>
              <option value="title">Title</option>
              <option value="items">Items</option>
              <option value="date">Date</option>
            </select>
          </div>
          <InventoryTable items={sort(data.withAccess, sortAccess)} />
        </section>
      )}
    </div>
  );
}

function InventoryTable({ items, showDelete }) {
  if (!items.length) return <div className="text-center py-8 text-slate-400 card">No inventories found</div>;

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Items</th>
            <th>Created</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {items.map(inv => (
            <tr key={inv.id}>
              <td>
                <Link to={`/inventories/${inv.id}`} className="font-medium text-brand-600 hover:underline">
                  {inv.title}
                </Link>
              </td>
              <td>{inv.category ? <span className="badge-gray">{inv.category}</span> : '—'}</td>
              <td><span className="font-mono text-sm">{inv.itemCount}</span></td>
              <td className="text-slate-400 text-xs">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</td>
              <td>{inv.isPublic ? <span className="badge-green">Public</span> : <span className="badge-gray">Private</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
