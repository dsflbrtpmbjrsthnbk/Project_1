import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { inventoriesApi } from '../../services/api';
import { Package, Heart, TrendingUp } from 'lucide-react';

export default function InventoryStats({ inventoryId }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', inventoryId],
    queryFn: () => inventoriesApi.stats(inventoryId)
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!stats) return null;

  const chartData = Object.entries(stats.itemsByMonth || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-brand-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Items</span>
          </div>
          <p className="text-3xl font-display font-bold text-slate-900">{stats.totalItems}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart size={18} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Likes</span>
          </div>
          <p className="text-3xl font-display font-bold text-slate-900">{stats.totalLikes}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Months Active</span>
          </div>
          <p className="text-3xl font-display font-bold text-slate-900">{chartData.length}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Items Added per Month</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="count" fill="#4c6ef5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
