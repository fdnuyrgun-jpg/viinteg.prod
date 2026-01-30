
import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, 
  Undo, Redo, 
  Terminal, Eraser, Upload, ChevronDown
} from 'lucide-react';
import { toast } from '../services/toast';
import { compressImage } from '../lib/fileUtils';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}

export const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, className = '', placeholder }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCommands, setActiveCommands] = useState<string[]>([]);
  const [currentBlock, setCurrentBlock] = useState('p');

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
        const isFocused = document.activeElement === contentRef.current;
        if (!isFocused || !value) {
            if (!value || value === '<p><br></p>') {
                contentRef.current.innerHTML = '';
            } else {
                contentRef.current.innerHTML = value;
            }
        }
    }
  }, [value]);

  const updateState = () => {
    const commands = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
    const active = commands.filter(cmd => document.queryCommandState(cmd));
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).commonAncestorContainer as HTMLElement;
      if (node.nodeType === 3) node = node.parentElement as HTMLElement;
      
      const pre = node.closest('pre');
      const h1 = node.closest('h1');
      const h2 = node.closest('h2');
      const h3 = node.closest('h3');
      const bq = node.closest('blockquote');

      if (pre) setCurrentBlock('pre');
      else if (h1) setCurrentBlock('h1');
      else if (h2) setCurrentBlock('h2');
      else if (h3) setCurrentBlock('h3');
      else if (bq) setCurrentBlock('blockquote');
      else setCurrentBlock('p');
    }
    setActiveCommands(active);
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    if (contentRef.current) contentRef.current.focus();
    document.execCommand(command, false, arg);
    updateState();
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (e.key === 'Tab' && currentBlock === 'pre') {
        e.preventDefault();
        exec('insertHTML', '    ');
        return;
    }

    if (e.key === 'Enter' && currentBlock === 'pre' && !e.shiftKey) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer as Node;
        if (node.nodeType === 3) node = node.parentElement!;
        const pre = (node as HTMLElement).closest('pre');
        
        if (pre) {
            const text = pre.innerText;
            if (text.endsWith('\n\n') || (text.endsWith('\n') && text.trim() === '')) {
                 e.preventDefault();
                 pre.innerText = text.trim();
                 const p = document.createElement('p');
                 p.innerHTML = '<br>';
                 if (pre.nextSibling) {
                     pre.parentNode?.insertBefore(p, pre.nextSibling);
                 } else {
                     pre.parentNode?.appendChild(p);
                 }
                 const newRange = document.createRange();
                 newRange.setStart(p, 0);
                 newRange.collapse(true);
                 selection.removeAllRanges();
                 selection.addRange(newRange);
                 updateState();
                 if (contentRef.current) onChange(contentRef.current.innerHTML);
                 return;
            }
        }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                  e.preventDefault();
                  hasImage = true;
                  toast.info('Сжатие изображения...');
                  compressImage(blob, 1024, 0.8).then(base64 => {
                      exec('insertImage', base64);
                  }).catch(err => {
                      toast.error('Ошибка вставки: ' + err.message);
                  });
              }
          }
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
          toast.info('Обработка...');
          const base64 = await compressImage(file, 1024, 0.8);
          exec('insertImage', base64);
          toast.success('Изображение вставлено');
      } catch (err: any) {
          toast.error(err.message);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ToolbarButton = ({ command, arg, icon, title, active, onClick }: any) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        else exec(command, arg);
      }}
      className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={`flex flex-col border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950 shadow-sm ${className}`}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
      
      <div className="flex items-center flex-wrap gap-1 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
        <ToolbarButton command="undo" icon={<Undo size={18} />} title="Назад" />
        <ToolbarButton command="redo" icon={<Redo size={18} />} title="Вперед" />
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>

        <div className="relative flex items-center">
            <select 
                className="h-10 text-[11px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 pr-8 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer text-slate-600 dark:text-slate-300"
                value={currentBlock}
                onChange={(e) => exec('formatBlock', e.target.value)}
            >
                <option value="p">Параграф</option>
                <option value="h1">Заголовок L1</option>
                <option value="h2">Заголовок L2</option>
                <option value="h3">Заголовок L3</option>
                <option value="blockquote">Цитата</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 pointer-events-none text-slate-400" />
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
        <ToolbarButton command="bold" icon={<Bold size={18} />} active={activeCommands.includes('bold')} title="Жирный" />
        <ToolbarButton command="italic" icon={<Italic size={18} />} active={activeCommands.includes('italic')} title="Курсив" />
        <ToolbarButton command="underline" icon={<Underline size={18} />} active={activeCommands.includes('underline')} title="Подчеркнутый" />

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
        <ToolbarButton command="justifyLeft" icon={<AlignLeft size={18} />} active={activeCommands.includes('justifyLeft')} title="Слева" />
        <ToolbarButton command="justifyCenter" icon={<AlignCenter size={18} />} active={activeCommands.includes('justifyCenter')} title="Центр" />
        <ToolbarButton command="justifyRight" icon={<AlignRight size={18} />} active={activeCommands.includes('justifyRight')} title="Справа" />

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
        <ToolbarButton command="insertUnorderedList" icon={<List size={18} />} active={activeCommands.includes('insertUnorderedList')} title="Список" />
        <ToolbarButton command="insertOrderedList" icon={<ListOrdered size={18} />} active={activeCommands.includes('insertOrderedList')} title="Нумерация" />

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
        <ToolbarButton 
            onClick={() => exec('formatBlock', currentBlock === 'pre' ? 'p' : 'pre')} 
            icon={<Terminal size={18} />} 
            active={currentBlock === 'pre'} 
            title="Код (Дважды Enter для выхода)"
        />
        <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={18} />} title="Изображение" />
        <ToolbarButton command="removeFormat" icon={<Eraser size={18} />} title="Очистить стиль" />
      </div>

      <div 
          ref={contentRef}
          className="rich-editor-content flex-1 p-12 md:p-16 outline-none prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-950 min-h-[700px] selection:bg-blue-100 dark:selection:bg-blue-900/40"
          contentEditable
          onInput={() => contentRef.current && onChange(contentRef.current.innerHTML)}
          onSelect={updateState}
          onKeyUp={updateState}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder || "Напишите ваш регламент..."}
      />

      <style>{`
        .rich-editor-content[contenteditable]:empty:before { content: attr(data-placeholder); color: #cbd5e1; pointer-events: none; font-style: italic; }
        .rich-editor-content ul { list-style-type: disc !important; padding-left: 2rem !important; margin: 1.5rem 0 !important; }
        .rich-editor-content ol { list-style-type: decimal !important; padding-left: 2rem !important; margin: 1.5rem 0 !important; }
        .rich-editor-content li { margin-bottom: 0.5rem !important; display: list-item !important; }
        .rich-editor-content img { max-width: 100%; border-radius: 2rem; margin: 3rem auto; display: block; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
        .rich-editor-content blockquote { border-left: 8px solid #3b82f6; background: #f8fafc; padding: 2rem 3rem; font-style: italic; border-radius: 0 2rem 2rem 0; margin: 2.5rem 0; font-size: 1.25rem; color: #475569; }
        .dark .rich-editor-content blockquote { background: #0f172a; color: #94a3b8; }
        
        .rich-editor-content pre { 
            background: #0d1117 !important; 
            color: #e6edf3 !important; 
            padding: 2.5rem !important; 
            border-radius: 1.5rem !important; 
            font-family: 'JetBrains Mono', monospace !important; 
            margin: 2.5rem 0 !important; 
            overflow-x: auto;
            border: 1px solid #30363d;
            line-height: 1.6;
            font-size: 0.95rem;
            position: relative;
        }

        .rich-editor-content h1 { font-size: 3.5rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 2rem; }
        .rich-editor-content h2 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin-top: 3rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
        .dark .rich-editor-content h2 { border-color: #1e293b; }
      `}</style>
    </div>
  );
};
