'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pseudonym, setPseudonym] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadMyStories() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return (window.location.href = '/auth');

      // Загружаем профиль с аватаром
      const { data: profile } = await supabase.from('profiles').select('pseudonym, avatar_url').eq('id', user.id).single();
      setPseudonym(profile?.pseudonym || '');
      setAvatarUrl(profile?.avatar_url || null);

      const { data } = await supabase
        .from('stories')
        .select('*, chapters(chapter_number, expires_at)')
        .eq('author_id', user.id);
      
      setStories(data || []);
      setLoading(false);
    }
    loadMyStories();
  }, []);

  const handleDelete = async (storyId: string, title: string) => {
    if (!confirm(`Удалить книгу "${title}"?`)) return;

    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    
    if (error) {
      alert("Ошибка базы данных: " + error.message);
    } else {
      setStories(stories.filter(s => s.id !== storyId));
    }
  };

  if (loading) return <div className="p-10 text-center font-sans text-slate-900 dark:text-white">Загрузка кабинета...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans text-slate-900 dark:text-white bg-white dark:bg-[#0A0A0A] min-h-screen">
      <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100 dark:border-gray-800">
        <Link 
          href="/" 
          className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-2"
        >
          <span>←</span> На главную
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 dark:text-gray-500 block uppercase font-black tracking-tighter">Автор</span>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{pseudonym}</span>
          </div>
          {/* Аватар: картинка или буква */}
          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-slate-400 dark:text-gray-500 text-xs overflow-hidden border border-slate-100 dark:border-gray-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-900 dark:text-white">{pseudonym ? pseudonym[0].toUpperCase() : '?'}</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Личный кабинет</h1>
        <Link 
          href="/write" 
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 dark:shadow-blue-900/30 hover:bg-blue-700 transition transform hover:-translate-y-1"
        >
          + Написать новую книгу
        </Link>
      </div>

      <div className="grid gap-6">
        {stories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-[#1A1A1A] rounded-[40px] border border-dashed border-slate-200 dark:border-gray-800">
            <p className="text-slate-400 dark:text-gray-500 font-medium">У вас пока нет опубликованных книг.</p>
          </div>
        ) : (
          stories.map(story => {
            // ТВОЙ ОРИГИНАЛЬНЫЙ ПОИСК ПОСЛЕДНЕЙ ГЛАВЫ
            const lastChapter = story.chapters?.reduce((prev: any, curr: any) => 
              (prev.chapter_number > curr.chapter_number) ? prev : curr, story.chapters[0] || null);
            
            const isVotingActive = lastChapter && new Date(lastChapter.expires_at) > new Date();

            return (
              <div 
                key={story.id} 
                className="border border-slate-100 dark:border-gray-800 p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#1A1A1A] hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow"
              >
                <div className="mb-6 md:mb-0">
                  <Link href={`/story/${story.id}`} className="group block">
                    <h2 className="text-2xl font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 text-slate-900 dark:text-white">
                      {story.title}
                      <span className="text-slate-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-normal">читать книгу ↗</span>
                    </h2>
                  </Link>
                  <p className="text-slate-400 dark:text-gray-500 text-sm">
                    Опубликовано глав: <span className="font-bold text-slate-600 dark:text-gray-400">{story.chapters?.length || 0}</span>
                  </p>
                </div>
                
                <div className="w-full md:w-auto flex items-center gap-3">
                  {/* КНОПКА УДАЛЕНИЯ СЛЕВА */}
                  <button 
                    onClick={() => handleDelete(story.id, story.title)}
                    className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800/30"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>

                  {isVotingActive ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 px-6 py-4 rounded-2xl text-center flex-1 md:min-w-[200px]">
                       <span className="text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase block mb-1 tracking-widest animate-pulse">Голосование активно</span>
                       <button disabled className="text-slate-400 dark:text-gray-500 text-sm font-bold cursor-not-allowed italic">Ожидайте</button>
                    </div>
                  ) : (
                    <Link 
                      href={`/dashboard/add-chapter?storyId=${story.id}&next=${(lastChapter?.chapter_number || 0) + 1}`}
                      className="inline-block text-center bg-slate-900 dark:bg-gray-800 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 dark:hover:bg-blue-700 transition shadow-lg dark:shadow-blue-900/30 flex-1 md:min-w-[200px]"
                    >
                      Глава {(lastChapter?.chapter_number || 0) + 1}
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}