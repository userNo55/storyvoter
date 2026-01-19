'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Link from 'next/link';

export default function HomePage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('pseudonym')
        .eq('id', user.id)
        .single();
      setUserNickname(profile?.pseudonym || user.email);
    }

    // Запрашиваем истории и проверяем, есть ли запись в favorites для текущего пользователя
    const { data } = await supabase
      .from('stories')
      .select(`
        *, 
        profiles(pseudonym), 
        chapters(id, expires_at, chapter_number),
        favorites(user_id)
      `)
      .filter('favorites.user_id', 'eq', user?.id || '00000000-0000-0000-0000-000000000000');

    setStories(data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const toggleFavorite = async (e: React.MouseEvent, storyId: string, isFav: boolean) => {
    e.preventDefault(); e.stopPropagation();
    if (!userId) return alert("Войдите в аккаунт");

    if (isFav) {
      await supabase.from('favorites').delete().match({ user_id: userId, story_id: storyId });
    } else {
      await supabase.from('favorites').insert({ user_id: userId, story_id: storyId });
    }
    loadData(); // Перезагружаем для обновления счетчиков и иконок
  };

  return (
    <main className="max-w-5xl mx-auto p-6 font-sans">
      <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100">
        <Link href="/"><h1 className="text-4xl font-black tracking-tighter uppercase">StoryVoter</h1></Link>
        <div className="flex items-center gap-6">
          {userNickname ? (
            <Link href="/profile" className="text-sm font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-full">{userNickname}</Link>
          ) : (
            <Link href="/auth" className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold">Войти</Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stories.map((story) => {
          const isFavorite = story.favorites && story.favorites.length > 0;
          return (
            <Link href={`/story/${story.id}`} key={story.id} className="group relative p-8 bg-white border border-slate-200 rounded-[32px] hover:shadow-xl transition-all flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-2">
                  <span className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-full text-slate-500">{story.age_rating || '16+'}</span>
                  <button 
                    onClick={(e) => toggleFavorite(e, story.id, isFavorite)}
                    className={`p-1.5 rounded-full transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-slate-400 bg-slate-100 hover:text-red-400'}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </button>
                </div>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase">
                  {story.favorites_count || 0} ❤️ | {story.chapters?.length || 0} ГЛАВ
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">{story.title}</h2>
              <p className="text-slate-400 text-sm mb-8 line-clamp-3 italic">{story.description}</p>
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-sm font-bold">
                <span>{story.profiles?.pseudonym || 'Автор'}</span>
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">→</div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
