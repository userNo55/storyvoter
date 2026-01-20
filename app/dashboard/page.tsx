'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pseudonym, setPseudonym] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  async function loadMyStories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/auth');

    // Загружаем псевдоним и аватар
    const { data: profile } = await supabase
      .from('profiles')
      .select('pseudonym, avatar_url')
      .eq('id', user.id)
      .single();
    
    setPseudonym(profile?.pseudonym || '');
    setAvatarUrl(profile?.avatar_url || null);

    const { data } = await supabase
      .from('stories')
      .select('*, chapters(chapter_number, expires_at)')
      .eq('author_id', user.id);
    
    setStories(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadMyStories();
  }, []);

  // Функция удаления книги
  const handleDeleteStory = async (storyId: string, title: string) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить книгу "${title}"? Все главы и голоса будут удалены безвозвратно.`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      alert("Ошибка при удалении: " + error.message);
    } else {
      // Обновляем список локально
      setStories(stories.filter(s => s.id !== storyId));
    }
  };

  if (loading) return <div className="p-10 text-center font-sans">Загрузка кабинета...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans text-slate-900">
      {/* ВЕРХНЯЯ НАВИГАЦИЯ */}
      <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100">
        <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-2">
          <span>←</span> На главную
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-black tracking-tighter">Автор</span>
            <span className="font-bold text-sm">{pseudonym}</span>
          </div>
          {/* АВАТАР АВТОРА */}
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden border border-slate-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              pseudonym[0]?.toUpperCase()
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <h1 className="text-4xl font-black tracking-tight">Личный кабинет</h1>
        <Link href="/write" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition transform hover:-translate-y-1">
          + Написать новую книгу
        </Link>
      </div>

      <div className="grid gap-6">
        {stories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">У вас пока нет опубликованных книг.</p>
          </div>
        ) : (
          stories.map(story => {
            const lastChapter = story.chapters?.reduce((prev: any, curr: any) => 
              (prev.chapter_number > curr.chapter_number) ? prev : curr, story.chapters[0] || null);
            
            const isVotingActive = lastChapter && new Date(lastChapter.expires_at) > new Date();

            return (
              <div key={story.id} className="group relative border border-slate-100 p-8 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:shadow-lg transition-all">
                
                {/* КНОПКА УДАЛЕНИЯ (в углу карточки) */}
                <button 
                  onClick={() => handleDeleteStory(story.id, story.title)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Удалить книгу"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-11v6" />
                  </svg>
                </button>

                <div className="mb-6 md:mb-0 pr-8">
                  <Link href={`/story/${story.id}`} className="group/link block">
                    <h2 className="text-2xl font-bold mb-1 group-hover/link:text-blue-600 transition-colors flex items-center gap-2">
                      {story.title}
                      <span className="text-slate-300 opacity-0 group-hover/link:opacity-100 transition-opacity text-sm font-normal">читать ↗</span>
                    </h2>
                  </Link>
                  <p className="text-slate-400 text-sm">Опубликовано глав: <span className="font-bold text-slate-600">{story.chapters?.length || 0}</span></p>
                </div>
                
                <div className="w-full md:w-auto">
                  {isVotingActive ? (
                    <div className="bg-orange-50 border border-orange-100 px-6 py-4 rounded-2xl text-center min-w-[240px]">
                       <span className="text-orange-600 text-[10px] font-black uppercase block mb-1 tracking-widest animate-pulse">Голосование активно</span>
                       <button disabled className="text-slate-400 text-sm font-bold cursor-not-allowed italic">Ожидайте завершения таймера</button>
                    </div>
                  ) : (
                    <Link 
                      href={`/dashboard/add-chapter?storyId=${story.id}&next=${(lastChapter?.chapter_number || 0) + 1}`}
                      className="inline-block w-full text-center bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg min-w-[240px]"
                    >
                      Написать главу {(lastChapter?.chapter_number || 0) + 1}
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
