import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-screen-2xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Toaster position="bottom-right" toastOptions={{
        className: '!rounded-xl !shadow-lg !text-sm',
        success: { className: '!bg-emerald-50 !text-emerald-900 !border !border-emerald-200' },
        error: { className: '!bg-red-50 !text-red-900 !border !border-red-200' },
      }} />
    </div>
  );
}
