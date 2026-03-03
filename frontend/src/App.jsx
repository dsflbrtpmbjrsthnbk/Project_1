import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InventoriesPage from './pages/InventoriesPage';
import InventoryPage from './pages/InventoryPage';
import ItemPage from './pages/ItemPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import InventoryForm from './components/inventory/InventoryForm';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
});

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="auth-callback" element={<AuthCallbackPage />} />
        <Route path="inventories" element={<InventoriesPage />} />
        <Route path="inventories/new" element={<RequireAuth><InventoryForm /></RequireAuth>} />
        <Route path="inventories/:id" element={<InventoryPage />} />
        <Route path="inventories/:inventoryId/items/:itemId" element={<ItemPage />} />
        <Route path="profile/:userId" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
