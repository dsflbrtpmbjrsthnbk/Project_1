import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Clock, Tag, ArrowRight, Package } from 'lucide-react';
import { inventoriesApi, tagsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

function InventoryTable({ inventories }) {
  if (!inventories || inventories.length === 0) return <div className="p-4 text-sm text-slate-500">No inventories found.</div>;

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Inventory</th>
            <th>Category</th>
            <th>Tags</th>
            <th>Author</th>
            <th>Items</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {inventories.map(inv => (
            <tr key={inv.id}>
              <td>
                <Link to={`/inventories/${inv.id}`} className="flex items-center gap-3 group">
                  {inv.imageUrl ? (
                    <img src={inv.imageUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-shrink-0 items-center justify-center">
                      <Package size={14} className="text-slate-400" />
                    </div>
                  )}
                  <span className="font-medium text-slate-900 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {inv.title}
                  </span>
                </Link>
              </td>
              <td>{inv.category || '—'}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {inv.tags?.split(',').filter(Boolean).slice(0, 2).map(tag => (
                    <span key={tag} className="badge-gray px-1.5 py-0.5 text-[10px]">{tag.trim()}</span>
                  ))}
                  {inv.tags?.split(',').filter(Boolean).length > 2 && <span className="text-xs text-slate-400">...</span>}
                </div>
              </td>
              <td>{inv.ownerName}</td>
              <td><span className="badge-gray">{inv.itemCount}</span></td>
              <td>{format(new Date(inv.createdAt), 'MMM d, yy')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: latest } = useQuery({
    queryKey: ['inventories', 'latest'],
    queryFn: () => inventoriesApi.list({ page: 1, pageSize: 6, sort: 'latest' })
  });
  const { data: popular } = useQuery({
    queryKey: ['inventories', 'popular'],
    queryFn: () => inventoriesApi.list({ page: 1, pageSize: 6, sort: 'popular' })
  });
  const { data: tagCloud } = useQuery({
    queryKey: ['tags', 'cloud'],
    queryFn: tagsApi.cloud
  });

  const maxCount = tagCloud ? Math.max(...tagCloud.map(t => t.count), 1) : 1;

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title dark:text-white">{t('manageCollections')} <br />
            <span className="text-brand-600 dark:text-brand-500">{t('beautifully')}</span>
          </h1>
          <p className="page-subtitle text-lg">{t('heroSubtitle')}</p>
        </div>
        {isAuthenticated && (
          <Link to="/inventories/new" className="btn-primary text-base px-6 py-3">
            <Plus size={18} /> {t('newInventory')}
          </Link>
        )}
      </div>

      {/* Latest Inventories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={20} className="text-brand-500" /> {t('latest')}
          </h2>
          <Link to="/inventories" className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1">
            {t('seeAll')} <ArrowRight size={14} />
          </Link>
        </div>
        <InventoryTable inventories={latest?.items} />
      </section>

      {/* Popular Inventories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" /> {t('popular')}
          </h2>
        </div>
        <InventoryTable inventories={popular?.items} />
      </section>

      {/* Tag Cloud */}
      {tagCloud?.length > 0 && (
        <section>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Tag size={20} className="text-brand-500" /> {t('tagCloud')}
          </h2>
          <div className="card p-6">
            <div className="flex flex-wrap gap-3 items-center">
              {tagCloud.map(({ tag, count }) => {
                const size = 12 + (count / maxCount) * 16;
                return (
                  <button key={tag} style={{ fontSize: size }}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                    className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors font-medium">
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
