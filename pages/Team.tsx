
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Input, Badge } from '../components/Common';
import { store } from '../services/store';
import { User, Role } from '../types';
import { Search, Mail, LayoutGrid, List } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export const Team: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Оптимизация: ждем 300мс после окончания ввода перед фильтрацией
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    store.getUsers().then(setUsers);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const lowerTerm = debouncedSearch.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(lowerTerm) || 
                            u.position.toLowerCase().includes(lowerTerm);
      return matchesSearch;
    });
  }, [users, debouncedSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Команда</h1>
           <p className="text-slate-500 dark:text-slate-400">Справочник сотрудников ({users.length})</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex gap-4 w-full md:w-auto ml-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Поиск сотрудника..." 
                    className="pl-10 mb-0 h-10 text-sm" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                >
                    <LayoutGrid size={18} />
                </button>
            </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
              <p>Сотрудники не найдены</p>
          </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
            {filteredUsers.map(user => (
            <Card key={user.id} className="flex flex-col items-center text-center p-0 overflow-hidden hover:-translate-y-1 transition-transform duration-300 group">
                <div className="w-full h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 relative">
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                        <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md group-hover:scale-105 transition-transform duration-300 bg-white dark:bg-slate-800"
                        />
                    </div>
                </div>
                
                <div className="pt-12 pb-6 px-6 w-full flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold mb-3">{user.position}</p>
                    <div className="flex justify-center gap-2 mb-6">
                    {user.role === Role.ADMIN && <Badge color="red">Админ</Badge>}
                    </div>
                    
                    <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 mt-auto">
                    <div className="flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" onClick={() => window.location.href = `mailto:${user.email}`}>
                        <Mail size={16} /> {user.email}
                    </div>
                    </div>
                </div>
            </Card>
            ))}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-700">
                            <th className="px-6 py-4 font-medium">Сотрудник</th>
                            <th className="px-6 py-4 font-medium">Должность</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium text-right">Статус</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 object-cover" />
                                        <span className="font-medium text-slate-900 dark:text-white">{user.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{user.position}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                    <a href={`mailto:${user.email}`} className="hover:text-blue-500">{user.email}</a>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.role === Role.ADMIN ? (
                                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">ADMIN</span>
                                    ) : (
                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">ACTIVE</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      )}
    </div>
  );
};
