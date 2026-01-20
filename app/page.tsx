'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Link from 'next/link';

export default function HomePage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Состояние фильтра: false — все, true — только избранное
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  async function loadData() {
    // 1. Проверяем пользователя
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

    // 2. Грузим истории
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

  useEffect(() => {
    loadData();
  }, []);

  // Функция добавления/удаления из избранного (ОПТИМИЗИРОВАННАЯ)
  const toggleFavorite = async (e: React.MouseEvent, storyId: string, isFav: boolean) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!userId) return alert("Войдите, чтобы добавлять в избранное");

    // --- МГНОВЕННОЕ ОБНОВЛЕНИЕ UI ---
    setStories(prevStories => 
      prevStories.map(story => {
        if (story.id === storyId) {
          return {
            ...story,
            favorites: isFav ? [] : [{ user_id: userId }]
          };
        }
        return story;
      })
    );

    // --- ФОНОВЫЙ ЗАПРОС К СЕРВЕРУ ---
    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: userId, story_id: storyId });
      
      if (error) {
        console.error(error);
        loadData(); // Откат при ошибке
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, story_id: storyId });
      
      if (error) {
        console.error(error);
        loadData(); // Откат при ошибке
      }
    }
    // loadData() здесь не вызываем, чтобы избежать лишнего мерцания
  };

  // Логика фильтрации списка
  const displayedStories = showFavoritesOnly 
    ? stories.filter(s => s.favorites && s.favorites.length > 0)
    : stories;

  return (
    <main className="max-w-5xl mx-auto p-6 font-sans">
      <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100">
        <Link href="/">
          <h1 className="text-4xl font-black tracking-tighter uppercase">StoryVoter</h1>
        </Link>
        
        <div className="flex items-center gap-6">
          {userNickname ? (
            <>
              {/* КНОПКА-ФИЛЬТР В ХЕДЕРЕ */}
              <button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 py-2 rounded-full transition-all duration-300 border ${
                  showFavoritesOnly 
                  ? 'bg-red-50 text-red-500 border-red-100' 
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-sm font-bold">{showFavoritesOnly ? 'bg-red-50 text-red-500 border-red-100' 
    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100'}</span>
              </button>

              <Link href="/dashboard" className="text-sm font-bold text-slate-600 hover:text-blue-600">Мои книги</Link>
              <Link href="/profile" className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-bold text-slate-800">{userNickname}</span>
              </Link>
            </>
          ) : (
            <Link href="/auth" className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold">
              Войти
            </Link>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка историй...</div>
      ) : displayedStories.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-slate-100">
          <p className="text-slate-400 font-medium">
            {showFavoritesOnly ? "У вас пока нет избранных книг." : "Книг пока нет."}
          </p>
          {showFavoritesOnly && (
            <button onClick={() => setShowFavoritesOnly(false)} className="mt-4 text-blue-600 font-bold text-sm underline">Показать все книги</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayedStories.map((story) => {
            const isFavorite = story.favorites && story.favorites.length > 0;

            return (
              <Link 
                href={`/story/${story.id}`} 
                key={story.id} 
                className="group relative p-8 bg-white border border-slate-200 rounded-[32px] hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full text-slate-500">
                      {story.age_rating || '16+'}
                    </span>
                    
                    <button 
                      onClick={(e) => toggleFavorite(e, story.id, isFavorite)}
                      className={`p-1.5 rounded-full transition-all duration-200 ${
                        isFavorite ? 'text-red-500 bg-red-50 shadow-sm' : 'text-slate-300 hover:text-red-400 bg-slate-50'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase">
                      {story.chapters?.length || 0} ГЛАВ
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                  {story.title}
                </h2>
                
                <p className="text-slate-400 text-sm mb-8 line-clamp-3 italic leading-relaxed">
                  {story.description || 'Описание отсутствует...'}
                </p>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-700">
                      {story.profiles?.pseudonym || 'Анонимный автор'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
