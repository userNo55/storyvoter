'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [pseudonym, setPseudonym] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Ошибка при выходе: ' + error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  if (loading) return <div className="p-10 text-center font-sans">Загрузка...</div>;
  if (!user) return <div className="p-10 text-center font-sans">Нужно войти в систему</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans text-slate-900 dark:text-white">
      {/* ИСПРАВЛЕННЫЙ ХЕДЕР */}
      <header className="flex items-center gap-4 mb-10 py-4 border-b border-slate-100 dark:border-gray-800">
        {/* Кнопка назад слева */}
        <Link 
          href="/" 
          className="flex-shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <span>←</span>
        </Link>
        
        {/* Пустое пространство, которое растягивается */}
        <div className="flex-grow"></div>
        
        {/* Заголовок справа */}
        <h1 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">
          Настройки
        </h1>
        
        {/* Кнопка выхода справа */}
        <button 
          onClick={handleSignOut}
          className="flex-shrink-0 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors group"
          title="Выйти из аккаунта"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-slate-500 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      {/* Остальной код остается без изменений */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-slate-100 dark:border-gray-800 p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-gray-800 mb-4 overflow-hidden border-4 border-white dark:border-gray-900 shadow-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-slate-400 dark:text-gray-500">👤</div>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase">Фото автора</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 dark:text-gray-500 mb-2 ml-1">Псевдоним</label>
            <input 
              type="text" 
              value={pseudonym} 
              onChange={(e) => setPseudonym(e.target.value)}
              className="w-full border-2 border-slate-50 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none transition text-slate-900 dark:text-white"
              placeholder="Как вас называть?"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 dark:text-gray-500 mb-2 ml-1">Ссылка на аватар (URL)</label>
            <input 
              type="text" 
              value={avatarUrl} 
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full border-2 border-slate-50 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none transition text-slate-900 dark:text-white"
              placeholder="https://image.com"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 dark:text-gray-500 mb-2 ml-1">Биография</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              className="w-full border-2 border-slate-50 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none transition h-32 text-slate-900 dark:text-white"
              placeholder="Расскажите о себе читателям..."
            />
          </div>

          <button 
            onClick={saveProfile} 
            className="w-full bg-slate-900 dark:bg-blue-600 text-white p-5 rounded-2xl font-bold hover:bg-blue-600 dark:hover:bg-blue-700 transition shadow-lg shadow-blue-100 dark:shadow-blue-900/30 mt-4"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}