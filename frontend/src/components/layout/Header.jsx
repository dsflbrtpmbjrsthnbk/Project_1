import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Package, User, LogOut, Shield, Moon, Sun, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { searchApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex items-center gap-4 px-4 h-16 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900 dark:text-white hidden sm:block">Collectify</span>
        </Link>

        {/* Global Search */}
        <div ref={searchRef} className="flex-1 max-w-xl relative mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('search')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg
                         text-slate-900 dark:text-white placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900
                         transition-all duration-150"
            />
          </div>

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t('notFound')}</div>
              ) : (
                results.map((r, i) => (
                  <button key={i} onClick={() => handleResultClick(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors">
                    <span className={`badge mt-0.5 ${r.type === 'inventory' ? 'badge-blue' : 'badge-green'}`}>
                      {r.type}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.subtitle}</div>}
                      {r.inventoryTitle && <div className="text-xs text-slate-400 dark:text-slate-500">in {r.inventoryTitle}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button onClick={toggleLanguage} className="btn-icon" title={t('language')}>
            <Globe size={18} />
            <span className="text-xs font-bold uppercase ml-1 opacity-70">{i18n.language}</span>
          </button>

          <button onClick={toggleTheme} className="btn-icon" title={t('theme')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <div className="relative ml-2">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4c6ef5&color=fff`}
                  className="w-7 h-7 rounded-full" alt="avatar" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">{user.displayName}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                  <Link to={`/profile/${user.id}`} onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <User size={15} /> {t('myProfile')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <Shield size={15} /> {t('adminPanel')}
                    </Link>
                  )}
                  <div className="border-t border-slate-100 dark:border-slate-700" />
                  <button onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOut size={15} /> {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary ml-2">{t('signIn')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
