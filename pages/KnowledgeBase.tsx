
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Input } from '../components/Common';
import { SafeHtml } from '../components/SafeHtml';
import { store } from '../services/store';
import { toast } from '../services/toast';
import { Article, User, ArticleAttachment } from '../types';
import { RichEditor } from '../components/RichEditor';
import { useDebounce } from '../hooks/useDebounce';
import { 
  BookOpen, Plus, Code2, 
  Calculator, Briefcase, Globe,
  Save, Pencil, Layout, ChevronLeft
} from 'lucide-react';

const DEPARTMENTS = [
  { name: 'Тех отдел', icon: <Code2 size={16} />, color: 'blue' },
  { name: 'Менеджеры', icon: <Briefcase size={16} />, color: 'orange' },
  { name: 'Бухгалтер', icon: <Calculator size={16} />, color: 'green' },
  { name: 'Генеральный директор', icon: <Globe size={16} />, color: 'red' }
];

export const KnowledgeBase: React.FC<{ user: User, onUpdate?: (user: User) => void }> = ({ user, onUpdate }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(DEPARTMENTS[0].name);
  const [folderName, setFolderName] = useState('');
  const [attachments, setAttachments] = useState<ArticleAttachment[]>([]);

  // Оптимизация поиска
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = () => store.getArticles().then(setArticles);

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      const matchesSearch = art.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (activeCategory === 'Все') return true;
      if (activeCategory === 'Избранное') return user.favorites?.includes(art.id);
      return art.category === activeCategory;
    });
  }, [articles, debouncedSearch, activeCategory, user.favorites]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Заголовок обязателен');
    if (editId) {
      const updated = await store.updateArticle(editId, { title, content, category, folder: folderName.trim() || undefined, attachments }, user.id);
      setArticles(articles.map(a => a.id === editId ? updated : a));
      setSelectedArticle(updated);
      toast.success('Обновлено');
    } else {
      const newArt = await store.addArticle({ title, content, category, folder: folderName.trim() || undefined, authorId: user.id, tags: [], attachments });
      loadArticles();
      setSelectedArticle(newArt);
      toast.success('Опубликовано');
    }
    setIsEditing(false);
  };

  const handleEdit = (article: Article) => {
    setEditId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setFolderName(article.folder || '');
    setAttachments(article.attachments || []);
    setIsEditing(true);
    setSelectedArticle(null);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-0 md:gap-8 animate-fade-in overflow-hidden">
      
      <div className={`w-full md:w-80 flex flex-col gap-8 ${selectedArticle || isEditing ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex justify-between items-center px-2">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3 italic"><BookOpen className="text-blue-600" /> WIKI</h1>
              <Button size="sm" className="rounded-2xl h-12 w-12 p-0" onClick={() => { setIsEditing(true); setSelectedArticle(null); setEditId(null); setTitle(''); setContent(''); setFolderName(''); setAttachments([]); }}>
                  <Plus size={24} />
              </Button>
          </div>
          <div className="px-2">
              <Input placeholder="Поиск знаний..." className="rounded-3xl h-14" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <nav className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
              <button onClick={() => {setActiveCategory('Все'); setSelectedArticle(null);}} className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl ${activeCategory === 'Все' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <div className="flex items-center gap-3"><Layout size={18} /><span>Все</span></div>
              </button>
              {DEPARTMENTS.map(dept => (
                  <button key={dept.name} onClick={() => {setActiveCategory(dept.name); setSelectedArticle(null);}} className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl ${activeCategory === dept.name ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      <div className="flex items-center gap-3">{dept.icon}<span>{dept.name}</span></div>
                  </button>
              ))}
          </nav>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
        {isEditing ? (
          <div className="flex flex-col h-full overflow-y-auto p-8 custom-scrollbar">
             <div className="flex justify-between items-center mb-8">
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900"><ChevronLeft size={32}/></button>
                <Button onClick={handleSave} className="rounded-2xl h-12 px-8"><Save size={18} className="mr-2"/> Сохранить</Button>
             </div>
             <div className="max-w-3xl mx-auto w-full space-y-6">
                <input className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 placeholder-slate-200 text-slate-900 dark:text-white" placeholder="Заголовок..." value={title} onChange={e => setTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                    <select className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border-none text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                        {DEPARTMENTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <input className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border-none text-sm" placeholder="Папка..." value={folderName} onChange={e => setFolderName(e.target.value)} />
                </div>
                <RichEditor value={content} onChange={setContent} />
             </div>
          </div>
        ) : selectedArticle ? (
          <div className="flex flex-col h-full overflow-y-auto p-8 md:p-12 custom-scrollbar">
             <div className="flex justify-between items-center mb-10 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur pb-4 z-10 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                   <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-900"><ChevronLeft size={24}/></button>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedArticle.category}</span>
                </div>
                <div className="flex gap-2">
                   <Button variant="secondary" size="sm" onClick={() => handleEdit(selectedArticle)} className="rounded-xl"><Pencil size={16} className="mr-2" /> Править</Button>
                </div>
             </div>

             <div className="max-w-3xl mx-auto w-full">
                <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter">{selectedArticle.title}</h1>
                <SafeHtml html={selectedArticle.content} className="prose prose-slate dark:prose-invert max-w-none" />
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center text-blue-600 mb-6"><BookOpen size={48} /></div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Wiki & Регламенты</h2>
             <p className="text-slate-500 max-w-xs mx-auto mb-8">Выберите статью слева, чтобы начать чтение или используйте поиск.</p>
             <Button onClick={() => setIsEditing(true)} className="rounded-2xl px-10 h-14 shadow-lg shadow-blue-500/10">Создать документ</Button>
          </div>
        )}
      </div>
    </div>
  );
};
