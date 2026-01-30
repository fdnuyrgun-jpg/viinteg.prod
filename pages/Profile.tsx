
import React, { useState, useRef } from 'react';
import { Card, Button, Input } from '../components/Common';
import { store } from '../services/store';
import { toast } from '../services/toast';
import { User } from '../types';
import { compressImage } from '../lib/fileUtils';
import { Camera, Save, RefreshCw, User as UserIcon, Lock, X, Upload, Loader2 } from 'lucide-react';

export const Profile: React.FC<{ user: User, onUpdate: (user: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    position: user.position,
    department: user.department,
    avatarUrl: user.avatarUrl
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Modal State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [isPassSaving, setIsPassSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const updatedUser = await store.updateCurrentUser(formData);
        onUpdate(updatedUser);
        toast.success('Профиль успешно обновлен!');
    } catch (e: any) {
        toast.error(e.message || 'Ошибка сохранения');
    } finally {
        setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      try {
          const base64 = await compressImage(file, 400, 0.8); // Аватарки можно жать сильнее (400px)
          setFormData({ ...formData, avatarUrl: base64 });
          toast.success('Фото обработано и готово к сохранению');
      } catch (err: any) {
          toast.error(err.message || 'Ошибка обработки фото');
      } finally {
          setIsProcessingImg(false);
          // Сброс инпута, чтобы можно было выбрать тот же файл повторно
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (passData.new !== passData.confirm) {
        setPassError('Новые пароли не совпадают');
        return;
    }
    if (passData.new.length < 6) {
        setPassError('Новый пароль должен быть не менее 6 символов');
        return;
    }

    setIsPassSaving(true);
    try {
        await store.changePassword(user.email, passData.old, passData.new);
        toast.success('Пароль успешно изменен');
        setIsPassModalOpen(false);
        setPassData({ old: '', new: '', confirm: '' });
    } catch (err: any) {
        setPassError(err.message || 'Ошибка смены пароля');
        toast.error('Не удалось сменить пароль');
    } finally {
        setIsPassSaving(false);
    }
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setFormData({
        ...formData,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&length=2&rounded=true&bold=true&seed=${randomSeed}`
    });
    toast.info('Сгенерирован случайный аватар');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-20">
        <div className="flex flex-col gap-1">
           <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">MY PROFILE</h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium">Управление личными данными и безопасностью аккаунта.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Avatar Section */}
                <Card className="lg:col-span-1 flex flex-col items-center text-center p-8 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-10"></div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />

                    <div className="relative mb-6 mt-4">
                        <div 
                            className="w-40 h-40 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl cursor-pointer relative group/avatar"
                            onClick={() => !isProcessingImg && fileInputRef.current?.click()}
                        >
                            <img 
                                src={formData.avatarUrl} 
                                alt="Avatar" 
                                className={`w-full h-full object-cover transition-all duration-500 group-hover/avatar:scale-110 ${isProcessingImg ? 'blur-sm opacity-50' : ''}`}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                                <Camera className="text-white" size={32} />
                            </div>
                            {isProcessingImg && (
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">{formData.name}</h3>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-8 uppercase tracking-widest">{formData.position}</p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            type="button"
                            disabled={isProcessingImg}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all font-bold text-xs disabled:opacity-50"
                        >
                            <Upload size={16} /> {isProcessingImg ? 'СЖАТИЕ...' : 'ЗАГРУЗИТЬ'}
                        </button>
                        <button 
                            type="button"
                            onClick={generateRandomAvatar}
                            className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-amber-50 hover:text-amber-500 transition-all"
                            title="Случайный аватар"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </Card>

                {/* Details Section */}
                <Card className="lg:col-span-2 p-8 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem]">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                                <UserIcon size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Персональные данные</h3>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setIsPassModalOpen(true)}
                            className="h-10 px-4 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                            <Lock size={14} /> Смена пароля
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ФИО</label>
                                <Input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                                    required
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email (защищен)</label>
                                <Input 
                                    type="email"
                                    value={formData.email} 
                                    disabled
                                    className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 opacity-60 font-bold cursor-not-allowed"
                                />
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Должность</label>
                                <Input 
                                    value={formData.position} 
                                    onChange={e => setFormData({...formData, position: e.target.value})}
                                    className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Департамент</label>
                                <Input 
                                    value={formData.department} 
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                    className="h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                                />
                             </div>
                        </div>
                        
                        <div className="pt-8 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={isSaving}
                                className="h-14 px-10 rounded-2xl shadow-xl shadow-blue-500/20 font-black text-xs uppercase tracking-[0.2em]"
                            >
                                {isSaving ? <><Loader2 className="animate-spin mr-2" /> СОХРАНЕНИЕ...</> : <><Save size={18} className="mr-3" /> Сохранить изменения</>}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </form>

        {/* Change Password Modal - No Changes Here */}
        {isPassModalOpen && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 border-none relative">
                    <button onClick={() => setIsPassModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <X size={24} />
                    </button>
                    
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Смена пароля</h3>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Текущий пароль</label>
                            <Input 
                                type="password" 
                                required 
                                value={passData.old}
                                onChange={e => setPassData({...passData, old: e.target.value})}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Новый пароль</label>
                            <Input 
                                type="password" 
                                required 
                                placeholder="Мин. 6 знаков"
                                value={passData.new}
                                onChange={e => setPassData({...passData, new: e.target.value})}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none"
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Подтверждение</label>
                            <Input 
                                type="password" 
                                required 
                                value={passData.confirm}
                                onChange={e => setPassData({...passData, confirm: e.target.value})}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none"
                            />
                        </div>
                        
                        {passError && <p className="text-red-500 text-xs font-bold text-center animate-pulse">{passError}</p>}
                        
                        <div className="pt-4 flex flex-col gap-2">
                             <Button 
                                type="submit" 
                                disabled={isPassSaving}
                                className="w-full h-14 rounded-2xl shadow-xl shadow-blue-500/20 font-black text-xs uppercase tracking-widest"
                            >
                                {isPassSaving ? 'ОБРАБОТКА...' : 'ОБНОВИТЬ ПАРОЛЬ'}
                             </Button>
                             <button 
                                type="button" 
                                onClick={() => setIsPassModalOpen(false)}
                                className="w-full h-12 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                ОТМЕНА
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
