
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { store } from './services/store';
import { User, Role, View } from './types';
import { Button, Input } from './components/Common';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutDashboard, Users, Book, FileText, Settings, LogOut, Menu, Briefcase, CheckSquare, Loader2, Moon, Sun, Github } from 'lucide-react';

// Production lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const AdminPanel = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminPanel })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const LoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center py-20">
    <Loader2 className="animate-spin text-blue-600" size={32} />
  </div>
);

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await store.login(email, password, rememberMe);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-800 animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><Briefcase size={32} /></div>
        </div>
        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tighter italic">VIntegCorp</h2>
        <p className="text-center text-slate-500 mb-10 text-sm font-medium">Система управления предприятием</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="employee@company.com" />
          <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 select-none cursor-pointer">
              Запомнить меня
            </label>
          </div>

          {error && (
            <div className="text-red-400 text-xs font-bold text-center animate-pulse bg-red-900/20 py-3 rounded-lg px-4 border border-red-900/50">
                {error.includes("Configuration Error") || error.includes("DATABASE_URL")
                    ? "⚠️ Ошибка сервера: Не настроено подключение к базе данных. Проверьте .env.local" 
                    : error}
            </div>
          )}
          
          <Button type="submit" className="w-full h-14 rounded-2xl text-base shadow-xl shadow-blue-500/10" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'ВОЙТИ'}
          </Button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const existing = store.getCurrentUser();
    if (existing) setUser(existing);
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const handleLogout = () => {
    store.logout();
    setUser(null);
    setCurrentView('login');
  };

  if (!user) return <><ToastContainer /><Login onLogin={setUser} /></>;

  const renderView = () => (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch(currentView) {
            case 'dashboard': return <Dashboard user={user} onNavigate={setCurrentView} />;
            case 'team': return <Team />;
            case 'tasks': return <Tasks />;
            case 'knowledge': return <KnowledgeBase user={user} onUpdate={setUser} />;
            case 'documents': return <Documents user={user} />;
            case 'profile': return <Profile user={user} onUpdate={setUser} />;
            case 'admin': return user.role === Role.ADMIN ? <AdminPanel /> : <div className="p-20 text-center font-bold">Доступ запрещен</div>;
            default: return <NotFound onNavigate={setCurrentView} />;
          }
        })()}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-300">
      <ToastContainer />
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform lg:relative lg:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center space-x-3 mb-10 px-2 cursor-pointer" onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Briefcase size={20} /></div>
            <span className="text-xl font-black tracking-tighter dark:text-white">VINTEG</span>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Главная' },
              { id: 'team', icon: <Users size={20} />, label: 'Команда' },
              { id: 'tasks', icon: <CheckSquare size={20} />, label: 'Задачи' },
              { id: 'knowledge', icon: <Book size={20} />, label: 'Wiki' },
              { id: 'documents', icon: <FileText size={20} />, label: 'Файлы' },
            ].map(item => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as View); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm'}`}>
                {item.icon} <span>{item.label}</span>
              </button>
            ))}
            {user.role === Role.ADMIN && (
              <button onClick={() => { setCurrentView('admin'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl mt-8 transition-all ${currentView === 'admin' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-red-900/10 font-bold text-sm'}`}>
                <Settings size={20} /> <span>Админ</span>
              </button>
            )}
          </nav>
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* GitHub Link */}
            <a 
                href="https://github.com/your-username/vintegcorp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
                    <Github size={18} />
                    <span>GitHub</span>
                </div>
            </a>

            <button 
                onClick={toggleTheme} 
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
                    {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
            </button>

            <div onClick={() => { setCurrentView('profile'); setSidebarOpen(false); }} className="flex items-center p-3 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group transition-colors">
              <img src={user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700" />
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl font-bold text-xs transition-colors">
              <LogOut size={16} /> <span>ВЫХОД</span>
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="lg:hidden p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <span className="font-black italic tracking-tighter text-xl text-slate-900 dark:text-white">VINTEG</span>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Menu /></button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950">
           <div className="max-w-7xl mx-auto">{renderView()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
