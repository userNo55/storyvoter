'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Link from 'next/link';

export default function HomePage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'new' | 'engagement'>('new');

  async function loadData() {
    setLoading(true);
    
    try {
      // Параллельный запуск запросов
      const [
        { data: { user } },
        storiesQuery
      ] = await Promise.all([
        supabase.auth.getUser(),
        (async () => {
          let query = supabase
            .from('stories')
            .select(`
              *, 
              profiles(pseudonym), 
              chapters(id, expires_at, chapter_number),
              favorites(user_id)
            `);

          if (sortOrder === 'new') {
            query = query.order('created_at', { ascending: false });
          } else {
            query = query.order('engagement', { ascending: false });
          }

          const { data } = await query;
          return { data };
        })()
      ]);

      setUserId(user?.id || null);

      if (user) {
        // Параллельный запрос профиля
        const { data: profile } = await supabase
          .from('profiles')
          .select('pseudonym')
          .eq('id', user.id)
          .single();
        setUserNickname(profile?.pseudonym || user.email);
      }

      // Фильтрация избранного после получения данных
      const filteredData = storiesQuery.data || [];
      const finalStories = user ? 
        filteredData.filter(story => 
          story.favorites?.some((fav: any) => fav.user_id === user.id)
        ) : 
        filteredData;

      setStories(finalStories);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [sortOrder]);

  const toggleFavorite = async (e: React.MouseEvent, storyId: string, isFav: boolean) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!userId) return alert("Войдите, чтобы добавлять в избранное");

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

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: userId, story_id: storyId });
      if (error) { console.error(error); loadData(); }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, story_id: storyId });
      if (error) { console.error(error); loadData(); }
    }
  };

  const displayedStories = showFavoritesOnly 
    ? stories.filter(s => s.favorites && s.favorites.length > 0)
    : stories;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] transition-colors duration-300">
      <main className="max-w-5xl mx-auto p-6 font-sans">
        
        <header className="flex justify-between items-center mb-12 py-6 border-b border-slate-100 dark:border-gray-800">
          <Link href="/">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Vilka</h1>
          </Link>
          
          <div className="flex items-center gap-4 md:gap-6">
            {userNickname ? (
              <>
                <div className="flex items-center bg-slate-50 dark:bg-[#1A1A1A] p-1 rounded-full border border-slate-100 dark:border-gray-800">
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'new' ? 'engagement' : 'new')}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      sortOrder === 'engagement' 
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50'
                        : 'bg-transparent text-slate-400 hover:text-orange-500'
                    }`}
                    title={sortOrder === 'engagement' ? "Сортировка: Популярные" : "Сортировать по вовлеченности"}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </button>

                  <button 
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      showFavoritesOnly 
                        ? 'text-red-500' 
                        : 'bg-transparent text-slate-400 hover:text-red-500'
                    }`}
                    title={showFavoritesOnly ? "Убрать фильтр" : "Показать избранное"}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                <Link href="/dashboard" className="hidden md:block text-sm font-bold text-slate-600 dark:text-gray-400 hover:text-blue-600">Мои книги</Link>
                <Link href="/profile" className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800 px-4 py-2 rounded-full hover:bg-slate-200 transition">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-bold text-slate-800 dark:text-gray-200">{userNickname}</span>
                </Link>
              </>
            ) : (
              <Link href="/auth" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-full text-sm font-bold">Войти</Link>
            )}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-8 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-gray-800 rounded-[32px] animate-pulse">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-6 w-16 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-6 w-20 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="h-8 bg-slate-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded mb-8"></div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-4 w-24 bg-slate-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedStories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-[#1A1A1A] rounded-[40px] border border-slate-100 dark:border-gray-800">
            <p className="text-slate-400 dark:text-gray-500 font-medium">
              {showFavoritesOnly ? "В избранном пока пусто." : "Книг пока нет."}
            </p>
            {showFavoritesOnly && (
              <button onClick={() => setShowFavoritesOnly(false)} className="mt-4 text-blue-600 font-bold text-sm underline">Показать всё</button>
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
                  className="group relative p-8 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-gray-800 rounded-[32px] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full text-slate-500 dark:text-gray-400">
                        {story.age_rating || '16+'}
                      </span>
                      
                      <button 
                        onClick={(e) => toggleFavorite(e, story.id, isFavorite)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          isFavorite ? 'text-red-500 bg-red-50 dark:bg-red-950/30' : 'text-slate-300 dark:text-gray-600 hover:text-red-400 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full uppercase">
                        ⚡ {story.engagement || 0}
                      </span>
                      <span className="text-[10px] font-bold text-blue-500 bg-slate-100 dark:bg-blue-950/30 px-3 py-1 rounded-full uppercase">
                        ГЛАВ: {story.chapters?.length || 0} 
                      </span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight text-slate-900 dark:text-white">
                    {story.title}
                  </h2>
                  
                  <p className="text-slate-400 dark:text-gray-500 text-sm mb-8 line-clamp-3 italic leading-relaxed">
                    {story.description || 'Описание отсутствует...'}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
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
    </div>
  );
}