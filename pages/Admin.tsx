
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '../components/Common';
import { store } from '../services/store';
import { User, Role, Announcement, Project } from '../types';
import { Settings, Users, FileText, Database, Plus, Trash2, Megaphone, Save, Briefcase, Pin, Layout } from 'lucide-react';

type Tab = 'users' | 'content' | 'projects' | 'settings';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Forms State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', position: '', department: 'Тех отдел', role: Role.EMPLOYEE, password: '' });
  
  const [isAddingAnn, setIsAddingAnn] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '', priority: 'medium' as const, isPinned: false });

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'active' as const });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    if (activeTab === 'users') store.getUsers().then(setUsers);
    if (activeTab === 'content') store.getAnnouncements().then(setAnnouncements);
    if (activeTab === 'projects') store.getProjects().then(setProjects);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addUser(newUser);
    setIsAddingUser(false);
    setNewUser({ name: '', email: '', position: '', department: 'Тех отдел', role: Role.EMPLOYEE, password: '' });
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    if(confirm('Удалить сотрудника?')) {
        await store.deleteUser(id);
        loadData();
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addAnnouncement(newAnn);
    setIsAddingAnn(false);
    setNewAnn({ title: '', content: '', priority: 'medium', isPinned: false });
    loadData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if(confirm('Удалить объявление?')) {
        await store.deleteAnnouncement(id);
        loadData();
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addProject(newProject);
    setIsAddingProject(false);
    setNewProject({ name: '', description: '', status: 'active' });
    loadData();
  };

  const handleDeleteProject = async (id: string) => {
      if(confirm('Удалить проект? Все задачи, связанные с ним, останутся.')) {
          await store.deleteProject(id);
          loadData();
      }
  }

  const TabButton: React.FC<{ id: Tab; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Панель администратора</h1>
           <p className="text-slate-500 dark:text-slate-400">Управление ресурсами компании</p>
         </div>
         <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
            <TabButton id="users" icon={<Users size={16} />} label="Сотрудники" />
            <TabButton id="content" icon={<Megaphone size={16} />} label="Новости" />
            <TabButton id="projects" icon={<Briefcase size={16} />} label="Проекты" />
            <TabButton id="settings" icon={<Settings size={16} />} label="Настройки" />
         </div>
      </div>

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Список сотрудников</h3>
            <Button size="sm" onClick={() => setIsAddingUser(!isAddingUser)}>
                {isAddingUser ? 'Отмена' : <><Plus size={16} className="mr-2"/> Добавить</>}
            </Button>
          </div>

          {isAddingUser && (
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 animate-fade-in">
                <h4 className="font-medium mb-4 text-slate-800 dark:text-white">Новый сотрудник</h4>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ФИО" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    <Input label="Email" type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    <Input label="Должность" required value={newUser.position} onChange={e => setNewUser({...newUser, position: e.target.value})} />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Отдел</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newUser.department}
                            onChange={e => setNewUser({...newUser, department: e.target.value})}
                        >
                            <option value="Тех отдел">Тех отдел</option>
                            <option value="Менеджеры">Менеджеры</option>
                            <option value="Генеральный директор">Генеральный директор</option>
                            <option value="Бухгалтер">Бухгалтер</option>
                        </select>
                    </div>

                    <Input 
                        label="Пароль" 
                        type="password"
                        required 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        placeholder="Минимум 6 символов"
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Роль</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                        >
                            <option value={Role.EMPLOYEE}>Сотрудник</option>
                            <option value={Role.ADMIN}>Администратор</option>
                        </select>
                    </div>
                    <div className="col-span-full flex justify-end mt-2">
                        <Button type="submit">Создать сотрудника</Button>
                    </div>
                </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                        <th className="px-4 py-3 font-medium">Сотрудник</th>
                        <th className="px-4 py-3 font-medium">Контакты</th>
                        <th className="px-4 py-3 font-medium">Роль</th>
                        <th className="px-4 py-3 font-medium text-right">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                                <div className="flex items-center space-x-3">
                                    <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white">{u.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.position} &bull; {u.department}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email}</td>
                            <td className="px-4 py-3">
                                <Badge color={u.role === Role.ADMIN ? 'red' : 'blue'}>
                                    {u.role === Role.ADMIN ? 'Админ' : 'Сотрудник'}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- CONTENT TAB --- */}
      {activeTab === 'content' && (
        <Card>
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Новости и объявления</h3>
            <Button size="sm" onClick={() => setIsAddingAnn(!isAddingAnn)}>
                {isAddingAnn ? 'Отмена' : <><Plus size={16} className="mr-2"/> Создать новость</>}
            </Button>
          </div>

          {isAddingAnn && (
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 animate-fade-in">
                <h4 className="font-medium mb-4 text-slate-800 dark:text-white">Новое объявление</h4>
                <form onSubmit={handleAddAnnouncement} className="space-y-4">
                    <Input label="Заголовок" required value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Приоритет</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newAnn.priority}
                                onChange={e => setNewAnn({...newAnn, priority: e.target.value as any})}
                            >
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-2">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={newAnn.isPinned}
                                    onChange={e => setNewAnn({...newAnn, isPinned: e.target.checked})}
                                 />
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                                     <Pin size={14} className="mr-1" /> Закрепить наверху
                                 </span>
                             </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Текст объявления</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                            required
                            value={newAnn.content}
                            onChange={e => setNewAnn({...newAnn, content: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit">Опубликовать</Button>
                    </div>
                </form>
            </div>
          )}

          <div className="space-y-3">
            {announcements.map(item => (
                <div key={item.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                             <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                                item.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 
                                item.priority === 'medium' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                             }`}>
                                {item.priority}
                             </span>
                             {item.isPinned && (
                                 <span className="flex items-center text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                     <Pin size={10} className="mr-1" /> Pinned
                                 </span>
                             )}
                             <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.content}</p>
                    </div>
                    <button onClick={() => handleDeleteAnnouncement(item.id)} className="text-slate-300 hover:text-red-500 dark:hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            {announcements.length === 0 && <p className="text-slate-400 text-center py-4">Нет активных объявлений</p>}
          </div>
        </Card>
      )}

      {/* --- PROJECTS TAB --- */}
      {activeTab === 'projects' && (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Управление проектами</h3>
                <Button size="sm" onClick={() => setIsAddingProject(!isAddingProject)}>
                    {isAddingProject ? 'Отмена' : <><Plus size={16} className="mr-2"/> Новый проект</>}
                </Button>
            </div>
            
            {isAddingProject && (
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 animate-fade-in">
                    <h4 className="font-medium mb-4 text-slate-800 dark:text-white">Новый проект</h4>
                    <form onSubmit={handleAddProject} className="space-y-4">
                        <Input label="Название" required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                value={newProject.description}
                                onChange={e => setNewProject({...newProject, description: e.target.value})}
                            ></textarea>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Статус</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newProject.status}
                                onChange={e => setNewProject({...newProject, status: e.target.value as any})}
                            >
                                <option value="active">Активный</option>
                                <option value="completed">Завершен</option>
                                <option value="on-hold">На паузе</option>
                            </select>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit">Создать проект</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                    <div key={p.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:shadow-md transition-all flex flex-col relative group">
                        <div className="flex justify-between items-start mb-2">
                             <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                                <Briefcase size={16} className="mr-2 text-blue-500" />
                                {p.name}
                             </h4>
                             <Badge color={p.status === 'active' ? 'green' : p.status === 'completed' ? 'gray' : 'orange'}>
                                 {p.status === 'active' ? 'Активен' : p.status === 'completed' ? 'Завершен' : 'Пауза'}
                             </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex-1 mb-2">{p.description || 'Нет описания'}</p>
                        
                        <button 
                             onClick={() => handleDeleteProject(p.id)}
                             className="absolute top-4 right-10 text-slate-300 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                             title="Удалить проект"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {projects.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Briefcase size={48} className="mb-4 opacity-50 mx-auto" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">Список проектов пуст</p>
                    <p className="text-sm">Создайте первый проект, чтобы привязывать к нему задачи.</p>
                </div>
            )}
        </Card>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <Card>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
            <Settings size={20} className="mr-2" /> Общие настройки
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Название компании" defaultValue="VIntegCorp" />
            <Input label="Email поддержки" defaultValue="helpdesk@corppulse.internal" />
            <div className="col-span-full">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Режим обслуживания</label>
                <div className="flex items-center space-x-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Запретить вход для сотрудников</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Используйте во время плановых обновлений.</p>
                </div>
                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out bg-slate-200 dark:bg-slate-600 rounded-full cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-500">
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out"></span>
                </div>
                </div>
            </div>
            </div>
            <div className="mt-6 flex justify-end">
            <Button>
                <Save size={16} className="mr-2" /> Сохранить настройки
            </Button>
            </div>
        </Card>
      )}
    </div>
  );
};
