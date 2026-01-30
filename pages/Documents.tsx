
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Button, Input, Badge } from '../components/Common';
import { store } from '../services/store';
import { DocumentFile, Role, User } from '../types';
import { toast } from '../services/toast';
import { useDebounce } from '../hooks/useDebounce';
import { compressImage, MAX_FILE_SIZE } from '../lib/fileUtils';
import { 
  FileText, Download, Upload, Search, File, 
  FileSpreadsheet, Image as ImageIcon, Trash2, FileType,
  LayoutGrid, List as ListIcon, Filter, Loader2
} from 'lucide-react';

export const Documents: React.FC<{ user: User }> = ({ user }) => {
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterType, setFilterType] = useState<string>('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Оптимизация поиска
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    loadDocs();
  }, [user]);

  const loadDocs = () => {
    store.getDocuments(user.role).then(setDocs);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
        let base64Data: string;
        let type = 'File';
        
        // Determine type and processing method
        if (file.type.includes('image')) {
            type = 'Image';
            // Compress images to save DB space and avoid 413
            base64Data = await compressImage(file, 1600, 0.85); 
        } else {
             if (file.type.includes('pdf')) type = 'PDF';
             else if (file.type.includes('sheet') || file.name.endsWith('xlsx')) type = 'Excel';
             else if (file.type.includes('word') || file.name.endsWith('docx')) type = 'Word';

             // Native read for non-images
             base64Data = await new Promise((resolve, reject) => {
                 if (file.size > MAX_FILE_SIZE) {
                    reject(new Error('Файл слишком большой (>3MB)'));
                    return;
                 }
                 const reader = new FileReader();
                 reader.readAsDataURL(file);
                 reader.onload = (e) => resolve(e.target?.result as string);
                 reader.onerror = (e) => reject(e);
             });
        }

        const size = (file.size / 1024 / 1024).toFixed(1) + ' MB';

        await store.addDocument({
            name: file.name,
            type: type,
            size: size === '0.0 MB' ? '< 1 MB' : size,
            uploadedBy: user.name,
            accessLevel: Role.EMPLOYEE,
            data: base64Data
        });

        loadDocs();
        toast.success('Файл успешно загружен');
    } catch (err: any) {
        toast.error(err.message || 'Ошибка загрузки файла');
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот документ?')) {
      await store.deleteDocument(id);
      loadDocs();
      toast.info('Документ удален');
    }
  };

  const handleDownload = async (doc: DocumentFile) => {
      setDownloadingId(doc.id);
      try {
        // Fetch full document with data from API on demand
        const fullDoc = await store.getDocument(doc.id);
        
        if (!fullDoc.data) {
          toast.error("Этот файл не содержит данных для скачивания");
          return;
        }
        
        const link = document.createElement('a');
        link.href = fullDoc.data;
        link.download = fullDoc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Скачано: ${doc.name}`);
      } catch (err) {
        toast.error("Ошибка при скачивании файла");
      } finally {
        setDownloadingId(null);
      }
  };

  const getIcon = (type: string, size: number = 24) => {
    switch (type) {
      case 'PDF': return <FileText size={size} className="text-red-500" />;
      case 'Excel': return <FileSpreadsheet size={size} className="text-emerald-600" />;
      case 'Image': return <ImageIcon size={size} className="text-blue-500" />;
      case 'Word': return <FileType size={size} className="text-blue-600" />;
      default: return <File size={size} className="text-slate-400" />;
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesFilter = filterType === 'All' || d.type === filterType;
        return matchesSearch && matchesFilter;
    });
  }, [docs, debouncedSearch, filterType]);

  const uniqueTypes = useMemo(() => ['All', ...Array.from(new Set(docs.map(d => d.type)))], [docs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Документы</h1>
           <p className="text-slate-500 dark:text-slate-400">Корпоративный архив, шаблоны и отчеты.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
            {isUploading ? 'Загрузка...' : 'Загрузить файл'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 scrollbar-hide">
            <Filter size={18} className="text-slate-400 mr-2 flex-shrink-0" />
            {uniqueTypes.map(type => (
                <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors whitespace-nowrap ${
                        filterType === type 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    {type === 'All' ? 'Все' : type}
                </button>
            ))}
         </div>

         <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Поиск..." 
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
                    <ListIcon size={18} />
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

      {filteredDocs.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
               <File size={48} className="mb-4 opacity-50" />
               <p>Документы не найдены</p>
           </div>
      ) : viewMode === 'list' ? (
        <Card className="p-0 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 font-medium">Название</th>
                  <th className="px-6 py-4 font-medium hidden sm:table-cell">Тип</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Размер</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Загрузил</th>
                  <th className="px-6 py-4 font-medium">Дата</th>
                  <th className="px-6 py-4 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-all">
                            {getIcon(doc.type)}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <Badge color="gray">{doc.type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm hidden md:table-cell">{doc.size}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm hidden md:table-cell">{doc.uploadedBy}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{doc.date}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
                              title="Скачать на диск"
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Download size={18} />}
                          </button>
                          {user.role === Role.ADMIN && (
                            <button 
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
            {filteredDocs.map(doc => (
                <div key={doc.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-lg transition-all hover:-translate-y-1 relative">
                    <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                         {getIcon(doc.type, 48)}
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-white truncate mb-1" title={doc.name}>{doc.name}</h3>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>{doc.size}</span>
                        <span>{doc.date}</span>
                    </div>
                    
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                             onClick={() => handleDownload(doc)}
                             disabled={downloadingId === doc.id}
                             className="p-1.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg shadow-sm hover:text-blue-500"
                             title="Скачать"
                         >
                            {downloadingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                         </button>
                         {user.role === Role.ADMIN && (
                            <button 
                                onClick={() => handleDelete(doc.id)}
                                className="p-1.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg shadow-sm hover:text-red-500"
                                title="Удалить"
                            >
                                <Trash2 size={14} />
                            </button>
                         )}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
