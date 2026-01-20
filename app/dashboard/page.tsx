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

    const { data: profile } = await supabase.from('profiles').select('pseudonym, avatar_url').eq('id', user.id).single();
    setPseudonym(profile?.pseudonym || '');
    setAvatarUrl(profile?.avatar_url || null);

    const { data } = await supabase.from('stories').select('*, chapters(chapter_number, expires_at)').eq('author_id', user.id);
    setStories(data || []);
    setLoading(false);
  }

  useEffect(() => { loadMyStories(); }, []);

  const handleDeleteStory = async (storyId: string, title: string) => {
    if (!confirm(`Удалить книгу "${title}" и все связанные с ней главы/голоса?`)) return;

    // Сначала удаляем все связанные данные (если в БД не настроен CASCADE)
    // В вашем случае это главы, донаты, транзакции, связанные с этой историей
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      console.error("Ошибка удаления:", error);
      alert("Не удалось удалить: " + error.message);
    } else {
      setStories(prev => prev.filter(s => s.id !== storyId));
    }
  };

  if (loading) return <div className="p-10 text-center font-sans italic text-slate-400">Загрузка кабинета...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans text-slate-900 min-h-screen bg-white">
      <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100">
        <Link href="/" className="text-sm font-bold text-blue-600 hover:gap-3 transition-all flex items-center gap-2">
          <span>←</span> На главную
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-black tracking-tighter">Автор</span>
            <span className="font-bold text-sm">{pseudonym}</span>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-100">
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="font-bold text-slate-400">{pseudonym[0]}</span>}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <h1 className="text-5xl font-black tracking-tight text-slate-900">Мои книги</h1>
        <Link href="/write" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition transform hover:-translate-y-1">
          + Новая книга
        </Link>
      </div>

      <div className="grid gap-8">
        {stories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
            <p className="text-slate-400">Список пуст.</p>
          </div>
        ) : (
          stories.map(story => {
            const lastChapter = story.chapters?.reduce((prev: any, curr: any) => 
              (prev.chapter_number > curr.chapter_number) ? prev : curr, story.chapters[0] || null);
            const isVotingActive = lastChapter && new Date(lastChapter.expires_at) > new Date();

            return (
              <div key={story.id} className="p-8 rounded-[40px] bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                <div className="flex-1">
                  <Link href={`/story/${story.id}`} className="group inline-block">
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors tracking-tight">{story.title}</h2>
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                    <span>Глав: <b className="text-slate-900">{story.chapters?.length || 0}</b></span>
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                  </div>
                </div>
                
                {/* БЛОК УПРАВЛЕНИЯ */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* КНОПКА УДАЛЕНИЯ СЛЕВА */}
                  <button 
                    onClick={() => handleDeleteStory(story.id, story.title)}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                    title="Удалить книгу"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6" />
                    </svg>
                  </button>

                  {/* КНОПКА ГЛАВЫ */}
                  {isVotingActive ? (
                    <div className="flex-1 md:w-64 bg-orange-100/50 border border-orange-200 px-6 py-4 rounded-2xl text-center">
                       <span className="text-orange-600 text-[10px] font-black uppercase block tracking-widest animate-pulse">Голосование...</span>
                    </div>
                  ) : (
                    <Link 
                      href={`/dashboard/add-chapter?storyId=${story.id}&next=${(lastChapter?.chapter_number || 0) + 1}`}
                      className="flex-1 md:w-64 text-center bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg shadow-slate-200"
                    >
                      + Глава {(lastChapter?.chapter_number || 0) + 1}
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
