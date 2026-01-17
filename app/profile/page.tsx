'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function ProfilePage() {
  const [pseudonym, setPseudonym] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setPseudonym(data.pseudonym || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
        }
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      pseudonym,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    });

    if (error) alert("Ошибка: возможно псевдоним уже занят");
    else alert("Профиль успешно обновлен!");
  };

  if (loading) return <div className="p-10 text-center font-sans">Загрузка...</div>;
  if (!user) return <div className="p-10 text-center font-sans">Нужно войти в систему</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans text-slate-900">
      {/* КНОПКА НАЗАД */}
      <header className="flex justify-between items-center mb-10 py-4 border-b">
        <Link href="/" className="text-sm font-bold text-blue-600 flex items-center gap-2">
          <span>←</span> На главную
        </Link>
        <h1 className="text-lg font-black uppercase tracking-widest">Настройки</h1>
      </header>

      <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-2xl shadow-slate-200/50">
        <div className="flex flex-col items-center mb-8">
           <div className="w-24 h-24 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-md">
             {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
             )}
           </div>
           <p className="text-xs text-slate-400 font-bold uppercase">Фото автора</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Псевдоним</label>
            <input 
              type="text" 
              value={pseudonym} 
              onChange={(e) => setPseudonym(e.target.value)}
              className="w-full border-2 border-slate-50 bg-slate-50 p-4 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition"
              placeholder="Как вас называть?"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Ссылка на аватар (URL)</label>
            <input 
              type="text" 
              value={avatarUrl} 
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full border-2 border-slate-50 bg-slate-50 p-4 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition"
              placeholder="https://image.com"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Биография</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              className="w-full border-2 border-slate-50 bg-slate-50 p-4 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition h-32"
              placeholder="Расскажите о себе читателям..."
            />
          </div>

          <button 
            onClick={saveProfile} 
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-100 mt-4"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}
