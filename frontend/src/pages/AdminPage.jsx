import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Trash2, Ban, CheckCircle, Crown, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, q],
    queryFn: () => adminApi.users({ page, pageSize: 20, q })
  });

  const mut = (fn, msg) => useMutation({
    mutationFn: fn,
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success(msg); }
  });

  const blockMut = useMutation({ mutationFn: adminApi.block, onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User blocked'); } });
  const unblockMut = useMutation({ mutationFn: adminApi.unblock, onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User unblocked'); } });
  const deleteMut = useMutation({ mutationFn: adminApi.delete, onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User deleted'); } });
  const makeAdminMut = useMutation({ mutationFn: adminApi.makeAdmin, onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Admin role granted'); } });
  const removeAdminMut = useMutation({ mutationFn: adminApi.removeAdmin, onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Admin role removed'); } });

  const pageCount = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-amber-600" />
        </div>
        <div className="page-header mb-0">
          <h1 className="page-title mb-0">Admin Panel</h1>
          <p className="page-subtitle">User management</p>
        </div>
      </div>

      <div className="mb-4">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Search users..." className="input max-w-sm" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Inventories</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600">
                        {u.displayName[0]}
                      </div>
                      <span className="font-medium">{u.displayName}</span>
                      {u.id === user?.id && <span className="badge-blue text-xs">You</span>}
                    </div>
                  </td>
                  <td className="text-slate-500 text-sm">{u.email}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map(r => (
                        <span key={r} className={r === 'Admin' ? 'badge-amber' : 'badge-gray'}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{u.ownedInventoryCount}</td>
                  <td className="text-xs text-slate-400">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                  <td>
                    {u.isBlocked ? <span className="badge-red">Blocked</span> : <span className="badge-green">Active</span>}
                  </td>
                  <td>
                    <div className="row-actions flex items-center gap-1">
                      {u.isBlocked ? (
                        <button onClick={() => unblockMut.mutate(u.id)} className="btn-icon text-emerald-500" title="Unblock">
                          <CheckCircle size={15} />
                        </button>
                      ) : (
                        <button onClick={() => blockMut.mutate(u.id)} className="btn-icon text-amber-500" title="Block">
                          <Ban size={15} />
                        </button>
                      )}
                      {u.roles.includes('Admin') ? (
                        <button onClick={() => removeAdminMut.mutate(u.id)} className="btn-icon text-slate-500" title="Remove admin">
                          <UserMinus size={15} />
                        </button>
                      ) : (
                        <button onClick={() => makeAdminMut.mutate(u.id)} className="btn-icon text-brand-500" title="Make admin">
                          <Crown size={15} />
                        </button>
                      )}
                      <button onClick={() => { if (confirm(`Delete ${u.displayName}?`)) deleteMut.mutate(u.id); }}
                        className="btn-icon text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
          <span className="text-sm text-slate-600">Page {page} of {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="btn-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
