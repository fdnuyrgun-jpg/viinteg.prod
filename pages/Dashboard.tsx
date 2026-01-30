
import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/Common';
import { SafeHtml } from '../components/SafeHtml';
import { store } from '../services/store';
import { toast } from '../services/toast';
import { User, Announcement, Task, EmployeeUpdate, View } from '../types';
import { parseMentions } from '../services/validation';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonStat, SkeletonFeed, SkeletonTask, SkeletonAnnouncement } from '../components/Skeletons';
import { Bell, Calendar, Users, FileText, CheckSquare, ExternalLink, Send, Heart, MessageCircle, TrendingUp, Clock, ChevronRight, Megaphone, Pin, Eye, EyeOff } from 'lucide-react';

const SimpleStat: React.FC<{ 
    label: string; 
    value: string; 
    icon: React.ReactNode; 
    color: string; 
    bgColor: string; 
    trend?: string;
    onClick?: () => void;
}> = ({ label, value, icon, color, bgColor, trend, onClick }) => (
  <Card 
    onClick={onClick}
    className={`flex items-center justify-between hover:-translate-y-1 transition-all duration-300 border-none shadow-md relative overflow-hidden group ${onClick ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500/20 active:scale-95' : 'cursor-default'}`}
  >
    <div className="flex items-center space-x-4 z-10">
        <div className={`p-3 rounded-xl ${bgColor} ${color} transition-transform group-hover:scale-110`}>
        {icon}
        </div>
        <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</p>
        </div>
    </div>
    {trend ? (
        <div className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full z-10">
            <TrendingUp size={12} className="mr-1" /> {trend}
        </div>
    ) : onClick && (
        <div className="text-slate-300 group-hover:text-blue-500 transition-colors z-10">
            <ChevronRight size={18} />
        </div>
    )}
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 ${color.replace('text-', 'bg-')}`}></div>
  </Card>
);

type FeedItem = 
  | (EmployeeUpdate & { type: 'update' })
  | (Announcement & { type: 'announcement' });

const FeedPost: React.FC<{ 
    item: FeedItem; 
    currentUser: User; 
    allUsers: User[];
    onLike: (id: string, type: 'update' | 'announcement') => void;
    onComment: (id: string, type: 'update' | 'announcement', text: string, mentions: string[]) => void;
    onMarkRead?: (id: string) => void;
}> = ({ item, currentUser, allUsers, onLike, onComment, onMarkRead }) => {
    const [commentText, setCommentText] = useState('');
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isLiked = item.likedBy?.includes(currentUser.id);
    const hasComments = item.comments && item.comments.length > 0;
    const isRead = item.type === 'announcement' && item.readBy?.includes(currentUser.id);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const { sanitized, mentions } = parseMentions(commentText, allUsers);
        
        onComment(item.id, item.type, sanitized, mentions);
        
        setTimeout(() => {
          setCommentText('');
          setIsSubmitting(false);
        }, 800);
    };

    const handleRead = () => {
      if (item.type === 'announcement' && !isRead && onMarkRead) {
        onMarkRead(item.id);
      }
    };

    const renderFooter = () => (
        <>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <button 
                    onClick={() => onLike(item.id, item.type)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                        isLiked ? 'text-pink-600' : 'text-slate-500 hover:text-pink-500'
                    }`}
                >
                    <Heart size={16} className={`transition-all ${isLiked ? 'fill-pink-600 scale-110' : ''}`} />
                    <span>{item.likes} Нравится</span>
                </button>
                <button 
                    onClick={() => setIsCommentOpen(!isCommentOpen)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                        isCommentOpen || hasComments ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'
                    }`}
                >
                    <MessageCircle size={16} />
                    <span>
                        {hasComments ? `${item.comments.length} Коммент.` : 'Комментировать'}
                    </span>
                </button>
                {item.type === 'announcement' && (
                  <button 
                    onClick={handleRead}
                    disabled={isRead}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ml-auto ${
                      isRead ? 'text-emerald-500 cursor-default' : 'text-slate-400 hover:text-blue-500'
                    }`}
                  >
                    {isRead ? <Eye size={16} /> : <EyeOff size={16} />}
                    <span>{isRead ? 'Прочитано' : 'Отметить прочитанным'}</span>
                  </button>
                )}
            </div>

            {(isCommentOpen || hasComments) && (
                <div className="mt-4 space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                    {hasComments && (
                        <div className="space-y-3 mb-4">
                            {item.comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={comment.authorAvatar} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                                    <div className="flex-1">
                                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{comment.authorName}</span>
                                                    <span className="text-[10px] text-slate-400">{comment.date}</span>
                                                </div>
                                                <SafeHtml html={comment.content} className="text-xs text-slate-600 dark:text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmitComment} className="flex gap-2">
                        <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="flex-1 relative">
                            <input 
                                className="w-full h-9 pl-3 pr-10 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Написать комментарий... (упоминайте через @Имя)"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <button 
                                type="submit" 
                                disabled={!commentText.trim() || isSubmitting}
                                className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );

    if (item.type === 'announcement') {
        return (
            <Card className={`p-6 border-l-4 ${isRead ? 'border-l-emerald-400' : 'border-l-blue-500'} shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-900/10 dark:to-slate-800/50 border-y-0 border-r-0 dark:border-slate-800 relative overflow-hidden`}>
                 {item.isPinned && (
                    <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center z-20">
                        <Pin size={12} className="mr-1 rotate-45" /> Закреплено
                    </div>
                 )}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Megaphone size={100} className="text-blue-600" />
                </div>
                <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isRead ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                         <Megaphone size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <h4 className={`font-bold text-lg leading-tight ${isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge color={item.priority === 'high' ? 'red' : isRead ? 'gray' : 'blue'}>
                                        {isRead ? 'Прочитано' : 'Официально'}
                                    </Badge>
                                    <span className="text-xs text-slate-400">{item.date}</span>
                                </div>
                             </div>
                        </div>
                        <p className={`text-base leading-relaxed whitespace-pre-wrap ${isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {item.content}
                        </p>
                        
                        {renderFooter()}
                    </div>
                </div>
            </Card>
        );
    }

    const update = item;
    
    return (
        <Card className="p-6 border-none shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
            <div className="flex items-start gap-4">
                <img 
                    src={update.authorAvatar} 
                    alt={update.authorName} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" 
                />
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{update.authorName}</h4>
                            <span className="text-xs text-slate-400">{update.date}</span>
                        </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-2 text-base leading-relaxed whitespace-pre-wrap">
                        {update.content}
                    </p>
                    
                    {renderFooter()}
                </div>
            </div>
        </Card>
    );
};

export const Dashboard: React.FC<{ user: User, onNavigate: (view: View) => void }> = ({ user, onNavigate }) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ users: 0, docs: 0 });
  const [newUpdateText, setNewUpdateText] = useState('');
  const [greeting, setGreeting] = useState('Привет');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Доброе утро');
    else if (hour < 18) setGreeting('Добрый день');
    else setGreeting('Добрый вечер');
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const anns = await store.getAnnouncements();
      const upds = await store.getEmployeeUpdates();
      const users = await store.getUsers();
      const docs = await store.getDocuments(user.role);
      const tasks = await store.getTasks();

      setAllUsers(users);
      setAnnouncements(anns);
      setStats({ users: users.length, docs: docs.length });

      const userTasks = tasks.filter(t => 
          t.assigneeName === user.name && t.status !== 'done'
      ).sort((a, b) => {
          const priorityMap = { high: 3, medium: 2, low: 1 };
          if (priorityMap[a.priority] !== priorityMap[b.priority]) {
              return priorityMap[b.priority] - priorityMap[a.priority];
          }
          return new Date(a.dueDate || '2099-01-01').getTime() - new Date(b.dueDate || '2099-01-01').getTime();
      });
      setMyTasks(userTasks);

      mergeAndSetFeed(upds, anns);
    } finally {
      // Small delay to prevent flickering if data loads too fast, 
      // allows skeletons to be seen for a moment to indicate activity
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  const mergeAndSetFeed = (updates: EmployeeUpdate[], anns: Announcement[]) => {
      const formattedUpdates: FeedItem[] = updates.map(u => ({ ...u, type: 'update' }));
      const formattedAnns: FeedItem[] = anns.map(a => ({ ...a, type: 'announcement' }));
      
      const merged = [...formattedUpdates, ...formattedAnns].sort((a, b) => {
          const isAPinned = a.type === 'announcement' && a.isPinned;
          const isBPinned = b.type === 'announcement' && b.isPinned;

          if (isAPinned && !isBPinned) return -1;
          if (!isAPinned && isBPinned) return 1;

          if (a.date === 'Только что') return -1;
          if (b.date === 'Только что') return 1;
          return b.date.localeCompare(a.date);
      });
      setFeedItems(merged);
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    await store.addEmployeeUpdate(newUpdateText);
    const upds = await store.getEmployeeUpdates();
    const anns = await store.getAnnouncements();
    mergeAndSetFeed(upds, anns);

    setNewUpdateText('');
    toast.success('Статус опубликован');
  };

  const handleLike = async (id: string, type: 'update' | 'announcement') => {
    let updated;
    if (type === 'update') {
        updated = await store.toggleFeedLike(id, user.id);
        setFeedItems(prev => prev.map(item => (item.id === id && item.type === 'update') ? { ...updated, type: 'update' } : item));
    } else {
        updated = await store.toggleAnnouncementLike(id, user.id);
        setFeedItems(prev => prev.map(item => (item.id === id && item.type === 'announcement') ? { ...updated, type: 'announcement' } : item));
    }
  };

  const handleComment = async (id: string, type: 'update' | 'announcement', text: string, mentions: string[]) => {
    let updated;
    if (type === 'update') {
        updated = await store.addFeedComment(id, user, text, mentions);
        setFeedItems(prev => prev.map(item => (item.id === id && item.type === 'update') ? { ...updated, type: 'update' } : item));
    } else {
        updated = await store.addAnnouncementComment(id, user, text, mentions);
        setFeedItems(prev => prev.map(item => (item.id === id && item.type === 'announcement') ? { ...updated, type: 'announcement' } : item));
    }
  };

  const handleMarkRead = async (id: string) => {
    await store.markAnnouncementAsRead(id, user.id);
    const anns = await store.getAnnouncements();
    const upds = await store.getEmployeeUpdates();
    mergeAndSetFeed(upds, anns);
    setAnnouncements(anns);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {greeting}, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-blue-100 opacity-90 max-w-lg">
              {isLoading 
                ? 'Загружаем вашу сводку...'
                : `На сегодня у вас ${myTasks.length} активных задач. Проверьте последние обновления и объявления.`
              }
          </p>
        </div>
        <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center space-x-4">
                 <div className="text-center">
                    <p className="text-xs text-blue-100 uppercase font-bold">Дата</p>
                    <p className="text-lg font-bold">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                 </div>
                 <div className="w-px h-8 bg-white/20"></div>
                 <div className="text-center">
                     <p className="text-xs text-blue-100 uppercase font-bold">Время</p>
                     <p className="text-lg font-bold flex items-center"><Clock size={16} className="mr-1"/> {new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</p>
                 </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
            <>
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </>
        ) : (
            <>
                <SimpleStat 
                    label="Команда" 
                    value={stats.users.toString()} 
                    icon={<Users size={24} />} 
                    color="text-blue-600 dark:text-blue-400" 
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                    onClick={() => onNavigate('team')}
                />
                <SimpleStat 
                    label="Мои задачи" 
                    value={myTasks.length.toString()} 
                    icon={<CheckSquare size={24} />} 
                    color="text-emerald-600 dark:text-emerald-400" 
                    bgColor="bg-emerald-50 dark:bg-emerald-900/20" 
                    onClick={() => onNavigate('tasks')}
                />
                <SimpleStat 
                    label="Документы" 
                    value={stats.docs.toString()} 
                    icon={<FileText size={24} />} 
                    color="text-amber-600 dark:text-amber-400" 
                    bgColor="bg-amber-50 dark:bg-amber-900/20" 
                    onClick={() => onNavigate('documents')}
                />
                <SimpleStat 
                    label="Новости" 
                    value={announcements.length.toString()} 
                    icon={<Bell size={24} />} 
                    color="text-red-600 dark:text-red-400" 
                    bgColor="bg-red-50 dark:bg-red-900/20" 
                />
            </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
                <form onSubmit={handlePostUpdate} className="flex gap-4">
                    <img 
                        src={user.avatarUrl} 
                        alt="Me" 
                        className="w-11 h-11 rounded-full bg-slate-200 object-cover border-2 border-slate-100 dark:border-slate-700" 
                    />
                    <div className="flex-1">
                         <div className="relative">
                            <input 
                                className="w-full h-12 px-5 pr-12 bg-slate-50 dark:bg-slate-800 border-none rounded-full focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm"
                                placeholder="Что нового? Поделитесь с коллегами..."
                                value={newUpdateText}
                                onChange={(e) => setNewUpdateText(e.target.value)}
                            />
                            <button 
                                type="submit" 
                                disabled={!newUpdateText.trim()}
                                className="absolute right-1.5 top-1.5 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors shadow-sm hover:shadow-md"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </form>
            </Card>

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                        <Users size={20} className="mr-2 text-blue-500" />
                        Живая лента
                    </h3>
                </div>
               
                {isLoading ? (
                    <>
                        <SkeletonFeed />
                        <SkeletonFeed />
                    </>
                ) : (
                    <>
                        {feedItems.map(item => (
                        <ErrorBoundary key={item.id}>
                            <FeedPost 
                                item={item} 
                                currentUser={user} 
                                allUsers={allUsers}
                                onLike={handleLike} 
                                onComment={handleComment} 
                                onMarkRead={handleMarkRead}
                            />
                        </ErrorBoundary>
                        ))}
                        
                        {feedItems.length === 0 && (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <p>Пока нет обновлений. Будьте первым!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        <div className="space-y-6">
             <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-none shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center uppercase tracking-wider">
                        <Bell size={16} className="mr-2 text-red-500" />
                        Официально
                    </h3>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {isLoading ? (
                        <>
                            <SkeletonAnnouncement />
                            <SkeletonAnnouncement />
                        </>
                    ) : (
                        <>
                            {announcements.map((item) => {
                            const isRead = item.readBy?.includes(user.id);
                            return (
                                <div key={item.id} className={`p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all group relative overflow-hidden ${isRead ? 'opacity-60' : 'ring-1 ring-blue-500/20'}`}>
                                    {item.isPinned && (
                                        <div className="absolute top-2 right-2 text-blue-500">
                                            <Pin size={12} className="rotate-45" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge color={isRead ? 'gray' : (item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'blue' : 'gray')}>
                                            {isRead ? 'Прочитано' : (item.priority === 'high' ? 'Важно' : 'Инфо')}
                                        </Badge>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase">{item.date}</span>
                                    </div>
                                    <h4 className={`text-sm font-bold mb-1 leading-snug ${isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>{item.title}</h4>
                                </div>
                            );
                            })}
                            {announcements.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4">Нет официальных новостей</p>
                            )}
                        </>
                    )}
                </div>
            </Card>

             <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-bold text-white flex items-center text-sm uppercase tracking-wider">
                        <CheckSquare size={16} className="mr-2 text-emerald-400" />
                        Мои задачи
                    </h3>
                    {!isLoading && (
                        <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full text-white">
                            {myTasks.length}
                        </span>
                    )}
                </div>
                
                <div className="space-y-3 relative z-10">
                    {isLoading ? (
                        <>
                            <SkeletonTask />
                            <SkeletonTask />
                        </>
                    ) : (
                        <>
                            {myTasks.slice(0, 3).map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => onNavigate('tasks')}
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/5 backdrop-blur-sm transition-colors cursor-pointer flex items-start gap-3 group"
                                >
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                        task.priority === 'high' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' : task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-400'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate group-hover:text-blue-200 transition-colors">{task.title}</p>
                                        <p className="text-xs text-slate-300 truncate mt-0.5 opacity-80">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Без срока'}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/80 self-center" />
                                </div>
                            ))}
                            {myTasks.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-24 text-slate-300 text-xs">
                                    <CheckSquare size={24} className="mb-2 opacity-50" />
                                    <p>Все задачи выполнены!</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {!isLoading && myTasks.length > 3 && (
                    <div className="mt-4 pt-3 border-t border-white/10 text-center relative z-10">
                        <button 
                            onClick={() => onNavigate('tasks')}
                            className="text-xs text-blue-200 font-medium hover:text-white transition-colors"
                        >
                            Смотреть ещё {myTasks.length - 3}
                        </button>
                    </div>
                )}
             </Card>
        </div>
      </div>
    </div>
  );
};
