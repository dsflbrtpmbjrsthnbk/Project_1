import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter, Search, Package } from 'lucide-react';
import { inventoriesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function InventoriesPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest');

  const { data, isLoading } = useQuery({
    queryKey: ['inventories', page, sort],
    queryFn: () => inventoriesApi.list({ page, pageSize: 20, sort })
  });

  const pageCount = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">All Inventories</h1>
          <p className="page-subtitle">{data?.total ?? '...'} inventories total</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
            className="input w-auto">
            <option value="latest">Latest</option>
            <option value="popular">Most Items</option>
          </select>
          {isAuthenticated && (
            <Link to="/inventories/new" className="btn-primary">
              <Plus size={16} /> New
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Tags</th>
                  <th>Owner</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/inventories/${inv.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                        {inv.title}
                      </Link>
                    </td>
                    <td>{inv.category ? <span className="badge-gray">{inv.category}</span> : '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {inv.tags.split(',').filter(Boolean).slice(0, 3).map(tag => (
                          <span key={tag} className="badge-gray">{tag.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-slate-500">{inv.ownerName}</td>
                    <td><span className="font-mono text-sm">{inv.itemCount}</span></td>
                    <td className="text-slate-400 text-xs">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</td>
                    <td>
                      {inv.isPublic
                        ? <span className="badge-green">Public</span>
                        : <span className="badge-gray">Private</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {page} of {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="btn-secondary">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
