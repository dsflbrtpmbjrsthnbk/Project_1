import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Package, Menu, X, Bell, User, LogOut, Settings, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { searchApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export default function Header({ onMenuToggle, menuOpen }) {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef(null);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      searchApi.search(debouncedQuery).then(r => { setResults(r); setShowResults(true); });
    } else {
      setResults([]); setShowResults(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleResultClick = (result) => {
    setQuery(''); setShowResults(false);
    if (result.type === 'inventory') navigate(`/inventories/${result.id}`);
    else navigate(`/inventories/${result.inventoryId}/items/${result.id}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-4 px-4 h-16 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900 hidden sm:block">Collectify</span>
        </Link>

        {/* Global Search */}
        <div ref={searchRef} className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventories and items..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white
                         transition-all duration-150"
            />
          </div>

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">No results found</div>
              ) : (
                results.map((r, i) => (
                  <button key={i} onClick={() => handleResultClick(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                    <span className={`badge mt-0.5 ${r.type === 'inventory' ? 'badge-blue' : 'badge-green'}`}>
                      {r.type}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-slate-500 mt-0.5">{r.subtitle}</div>}
                      {r.inventoryTitle && <div className="text-xs text-slate-400">in {r.inventoryTitle}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4c6ef5&color=fff`}
                  className="w-7 h-7 rounded-full" alt="avatar" />
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.displayName}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                  <Link to={`/profile/${user.id}`} onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <User size={15} /> My Profile
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      <Shield size={15} /> Admin Panel
                    </Link>
                  )}
                  <hr className="border-slate-100" />
                  <button onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
