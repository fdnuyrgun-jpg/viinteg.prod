
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Button, Input, Badge } from '../components/Common';
import { store } from '../services/store';
import { toast } from '../services/toast';
import { Task, TaskStatus, User, Project } from '../types';
import { Plus, X, Trash2, CheckCircle2, Circle, Clock, Calendar, Search, Filter, Pencil, MoreHorizontal, Briefcase } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonTask } from '../components/Skeletons';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterMe, setFilterMe] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isDragOverColumn, setIsDragOverColumn] = useState<TaskStatus | null>(null);
  
  const dragItem = useRef<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    status: 'todo',
    assigneeName: '',
    dueDate: '',
    projectId: ''
  });

  useEffect(() => {
    loadData();
    const user = store.getCurrentUser();
    setCurrentUser(user);
    if (user) {
        setFormData(prev => ({ ...prev, assigneeName: user.name }));
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [t, u, p] = await Promise.all([
            store.getTasks(),
            store.getUsers(),
            store.getProjects()
        ]);
        setTasks(t);
        setUsers(u);
        setProjects(p);
    } finally {
        setIsLoading(false);
    }
  };

  const getAssigneeAvatar = (name?: string) => {
      const user = users.find(u => u.name === name);
      return user?.avatarUrl;
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        status: 'todo',
        assigneeName: currentUser?.name || '',
        dueDate: '',
        projectId: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({ ...task, projectId: task.projectId || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    // Correctly handle null project assignment by sending explicit null or ID
    const payload = { ...formData };
    if (payload.projectId === '') {
        // Cast to any to bypass strict type check for null on string | undefined
        // The server schema allows null
        payload.projectId = null as any; 
    }

    if (editingTask) {
        // Optimistic UI Update for Edit
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload, projectId: payload.projectId || undefined } as Task : t));
        setIsModalOpen(false);

        try {
            await store.updateTask(editingTask.id, payload);
            toast.success('Задача обновлена');
            loadData(); // Reload to sync joined data (project name)
        } catch (e) {
            toast.error('Ошибка обновления задачи');
            loadData(); // Revert on error
        }
    } else {
        const newTask = await store.addTask({
            title: payload.title,
            description: payload.description || '',
            status: payload.status as TaskStatus || 'todo',
            priority: (payload.priority as any) || 'medium',
            assigneeName: payload.assigneeName,
            dueDate: payload.dueDate,
            projectId: payload.projectId
        });
        setTasks(prev => [newTask, ...prev]);
        setIsModalOpen(false);
        toast.success('Задача создана');
        loadData(); // Reload to sync joined data
    }
  };

  const handleDelete = async (id: string) => {
      if(confirm('Удалить задачу?')) {
          // Optimistic Delete
          const prevTasks = [...tasks];
          setTasks(prev => prev.filter(t => t.id !== id));
          setIsModalOpen(false);

          try {
              await store.deleteTask(id);
              toast.info('Задача удалена');
          } catch (e) {
              setTasks(prevTasks); // Revert
              toast.error('Не удалось удалить задачу');
          }
      }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragItem.current = id;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Для совместимости
    e.dataTransfer.dropEffect = 'move';
    
    // Set dragged ID immediately to control styles
    setDraggedTaskId(id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset all drag states regardless of drop success
    setDraggedTaskId(null);
    setIsDragOverColumn(null);
    dragItem.current = null;
  };

  const handleDragEnter = (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault();
      setIsDragOverColumn(status);
  }

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    
    // Cleanup states immediately
    setIsDragOverColumn(null);
    setDraggedTaskId(null);

    if (id) {
        const task = tasks.find(t => t.id === id);
        if (task && task.status !== status) {
            // Optimistic Update: Update UI immediately
            const previousTasks = [...tasks];
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
            
            try {
                // Background API call
                await store.updateTaskStatus(id, status);
                // No toast needed for smooth action, unless error
            } catch (error) {
                // Revert on failure
                setTasks(previousTasks);
                toast.error('Ошибка сохранения статуса');
            }
        }
    }
  };

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          const matchesSearch = t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                                (t.projectName && t.projectName.toLowerCase().includes(debouncedSearch.toLowerCase()));
          const matchesMe = filterMe ? t.assigneeName === currentUser?.name : true;
          return matchesSearch && matchesMe;
      });
  }, [tasks, debouncedSearch, filterMe, currentUser]);

  const Column = ({ title, status, icon, colorClass }: { title: string, status: TaskStatus, icon: React.ReactNode, colorClass: string }) => {
      const columnTasks = filteredTasks.filter(t => t.status === status);
      const isOver = isDragOverColumn === status;
      
      return (
        <div 
            className={`flex-1 min-w-[320px] flex flex-col h-full rounded-2xl transition-colors duration-200 border border-slate-200 dark:border-slate-800 ${
                isOver 
                ? 'bg-blue-50/80 dark:bg-blue-900/20 ring-2 ring-blue-400 dark:ring-blue-500' 
                : 'bg-slate-100/50 dark:bg-slate-900/50'
            }`}
            onDragEnter={(e) => handleDragEnter(e, status)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
        >
            <div className={`p-4 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl flex justify-between items-center ${colorClass} bg-opacity-10`}>
                <div className="flex items-center space-x-2">
                    {icon}
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                </div>
                <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                    {columnTasks.length}
                </span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <>
                      <SkeletonTask />
                      <SkeletonTask />
                      <SkeletonTask />
                    </>
                ) : (
                    <>
                        {columnTasks.map(task => {
                            const avatar = getAssigneeAvatar(task.assigneeName);
                            const isDragging = draggedTaskId === task.id;
                            
                            return (
                                <div 
                                    key={task.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                        relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 
                                        transition-all duration-200 group cursor-grab active:cursor-grabbing select-none
                                        ${isDragging ? 'opacity-40 grayscale scale-[0.98]' : 'hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-0.5'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge color={
                                            task.priority === 'high' ? 'red' : 
                                            task.priority === 'medium' ? 'blue' : 'gray'
                                        }>
                                            {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            {task.dueDate && (
                                                <div className={`flex items-center text-xs font-medium mr-1 ${
                                                    new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-slate-400'
                                                }`}>
                                                    <Calendar size={12} className="mr-1" />
                                                    {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(task);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                                title="Редактировать"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {task.projectName && (
                                        <div className="text-[10px] text-blue-500 font-bold uppercase mb-1 flex items-center">
                                            <Briefcase size={10} className="mr-1" />
                                            {task.projectName}
                                        </div>
                                    )}

                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight pr-6">{task.title}</h4>
                                    
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center space-x-2">
                                            {avatar ? (
                                                <img src={avatar} alt={task.assigneeName} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover" title={task.assigneeName} />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-800 text-slate-500">?</div>
                                            )}
                                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{task.assigneeName || 'Не назначен'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                            ID-{task.id.substring(0, 3)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {columnTasks.length === 0 && (
                             <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-2 bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="mb-2 opacity-50"><Plus size={24} /></div>
                                <span>Перетащите сюда</span>
                             </div>
                        )}
                    </>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Задачи</h1>
           <p className="text-slate-500 dark:text-slate-400">Управление проектами и поручениями.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Поиск по названию или проекту..." 
                    className="pl-10 mb-0 h-10 text-sm" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setFilterMe(!filterMe)}
                className={`flex items-center px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    filterMe 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Filter size={16} className="mr-2" />
                Мои задачи
            </button>
            <Button onClick={openCreateModal}>
                 <Plus size={16} className="mr-2" /> Создать
            </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 px-1">
        <Column 
            title="К выполнению" 
            status="todo" 
            icon={<Circle size={18} className="text-slate-500"/>} 
            colorClass="bg-slate-200 text-slate-700"
        />
        <Column 
            title="В работе" 
            status="in-progress" 
            icon={<Clock size={18} className="text-blue-600"/>} 
            colorClass="bg-blue-100 text-blue-700"
        />
        <Column 
            title="Готово" 
            status="done" 
            icon={<CheckCircle2 size={18} className="text-emerald-600"/>} 
            colorClass="bg-emerald-100 text-emerald-700"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 animate-fade-in scale-100">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingTask ? 'Редактировать задачу' : 'Новая задача'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Название задачи" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Например: Обновить макеты" />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-sm"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="Детали задачи..."
                        ></textarea>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Проект</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.projectId || ''}
                            onChange={e => setFormData({...formData, projectId: e.target.value})}
                        >
                            <option value="">Без проекта</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Приоритет</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.priority}
                                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                            >
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Исполнитель</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.assigneeName || ''}
                                onChange={e => setFormData({...formData, assigneeName: e.target.value})}
                            >
                                <option value="">Не назначен</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Срок выполнения</label>
                        <input 
                            type="date"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.dueDate || ''}
                            onChange={e => setFormData({...formData, dueDate: e.target.value})}
                        />
                    </div>

                    <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 mt-4">
                        {editingTask ? (
                            <button 
                                type="button"
                                onClick={() => handleDelete(editingTask.id)} 
                                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                <Trash2 size={16} className="mr-1" /> Удалить
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex gap-2">
                             <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
                             <Button type="submit">{editingTask ? 'Сохранить' : 'Создать'}</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
