import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoriesApi, authApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export default function AccessManager({ inventoryId }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data: accessList } = useQuery({
    queryKey: ['access', inventoryId],
    queryFn: () => inventoriesApi.getAccess(inventoryId)
  });

  // Search users
  useState(() => {
    if (debouncedSearch.length > 1) {
      authApi.searchUsers(debouncedSearch).then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  const addMut = useMutation({
    mutationFn: (userIdOrEmail) => inventoriesApi.addAccess(inventoryId, { userIdOrEmail }),
    onSuccess: () => { qc.invalidateQueries(['access', inventoryId]); setSearch(''); setSuggestions([]); toast.success('Access granted'); }
  });

  const removeMut = useMutation({
    mutationFn: (userId) => inventoriesApi.removeAccess(inventoryId, userId),
    onSuccess: () => { qc.invalidateQueries(['access', inventoryId]); toast.success('Access removed'); }
  });

  return (
    <div className="max-w-xl space-y-6">
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Grant Access</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-9" />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-10">
                {suggestions.map(u => (
                  <button key={u.id} onClick={() => addMut.mutate(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600">
                      {u.displayName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{u.displayName}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => search && addMut.mutate(search)} className="btn-primary">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Users with write access ({accessList?.length ?? 0})</h3>
        </div>
        {accessList?.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No users with write access yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accessList?.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-sm font-bold text-brand-600">
                  {u.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{u.displayName}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
                <button onClick={() => removeMut.mutate(u.id)} className="btn-icon text-red-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
