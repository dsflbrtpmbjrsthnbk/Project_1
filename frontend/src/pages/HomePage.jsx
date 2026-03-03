import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Clock, Tag, ArrowRight, Package } from 'lucide-react';
import { inventoriesApi, tagsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

function InventoryCard({ inv }) {
  return (
    <Link to={`/inventories/${inv.id}`}
      className="card hover:shadow-md hover:border-brand-200 transition-all duration-200 group p-5 flex flex-col gap-3">
      {inv.imageUrl && (
        <img src={inv.imageUrl} alt={inv.title}
          className="w-full h-32 object-cover rounded-lg -mt-1" />
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
          {inv.title}
        </h3>
        <span className="badge-gray shrink-0">{inv.itemCount} items</span>
      </div>
      {inv.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{inv.description}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">by {inv.ownerName}</span>
        <span className="text-xs text-slate-400">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</span>
      </div>
      {inv.tags && (
        <div className="flex flex-wrap gap-1">
          {inv.tags.split(',').filter(Boolean).slice(0, 3).map(tag => (
            <span key={tag} className="badge-gray text-xs">{tag.trim()}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
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
    <div className="space-y-12">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Manage your collections,<br/>
            <span className="text-brand-600">beautifully.</span>
          </h1>
          <p className="page-subtitle text-lg">Create inventories, define custom fields, and track everything.</p>
        </div>
        {isAuthenticated && (
          <Link to="/inventories/new" className="btn-primary text-base px-6 py-3">
            <Plus size={18} /> New Inventory
          </Link>
        )}
      </div>

      {/* Latest Inventories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Clock size={20} className="text-brand-500" /> Latest
          </h2>
          <Link to="/inventories" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latest?.items?.map(inv => <InventoryCard key={inv.id} inv={inv} />)}
        </div>
      </section>

      {/* Popular Inventories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" /> Popular
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular?.items?.map(inv => <InventoryCard key={inv.id} inv={inv} />)}
        </div>
      </section>

      {/* Tag Cloud */}
      {tagCloud?.length > 0 && (
        <section>
          <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Tag size={20} className="text-brand-500" /> Tag Cloud
          </h2>
          <div className="card p-6">
            <div className="flex flex-wrap gap-3 items-center">
              {tagCloud.map(({ tag, count }) => {
                const size = 12 + (count / maxCount) * 16;
                return (
                  <span key={tag} style={{ fontSize: size }}
                    className="text-slate-600 hover:text-brand-600 cursor-pointer transition-colors font-medium">
                    #{tag}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
