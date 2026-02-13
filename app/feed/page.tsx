'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [votedChapters, setVotedChapters] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  
  const touchTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    async function loadFeed() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Получаем главы за последние 24 часа
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);

      const { data: chaptersData } = await supabase
        .from('chapters')
        .select(`
          *,
          story:stories!inner(
            id,
            title,
            author_id,
            profiles!inner(pseudonym, avatar_url)
          ),
          options(*)
        `)
        .gte('created_at', dayAgo.toISOString())
        .order('created_at', { ascending: false });

      if (chaptersData) {
        setChapters(chaptersData);
      }

      // Если пользователь авторизован, загружаем его избранное и проголосованные главы
      if (user) {
        const [favsResult, votesResult] = await Promise.all([
          supabase.from('favorites').select('story_id').eq('user_id', user.id),
          supabase.from('votes').select('chapter_id').eq('user_id', user.id)
        ]);
        
        setFavorites(new Set(favsResult.data?.map(f => f.story_id) || []));
        setVotedChapters(new Set(votesResult.data?.map(v => v.chapter_id) || []));
      }

      setLoading(false);
    }

    loadFeed();
  }, []);

  // Обработка двойного тапа для перехода к следующей главе
  const handleDoubleTap = () => {
    if (currentIndex < chapters.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (!localStorage.getItem('feed_tooltip_shown')) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
        localStorage.setItem('feed_tooltip_shown', 'true');
      }
    }
  };

  const handleTap = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.closest('a, button')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      
      if (touchTimer.current) {
        clearTimeout(touchTimer.current);
      }
      
      touchTimer.current = setTimeout(() => {
        lastTapRef.current = 0;
        touchTimer.current = undefined;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    setTouchEnd(touchEndX);
    
    const distance = Math.abs(touchEndX - touchStart);
    
    if (distance < 10) {
      handleTap(e);
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  const toggleFavorite = async (e: React.MouseEvent, storyId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/auth');
      return;
    }

    const isFavorite = favorites.has(storyId);

    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFavorite) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });

    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .match({ user_id: user.id, story_id: storyId });
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, story_id: storyId });
    }
  };

  // Проверка, доступно ли голосование
  const canVote = (chapter: any) => {
    if (!user) return false;
    const now = new Date();
    const expiresAt = new Date(chapter.expires_at);
    return expiresAt > now && !votedChapters.has(chapter.id);
  };

  const handleVote = async (optionId: string, chapterId: string, currentVotes: number) => {
    if (!user) {
      router.push('/auth');
      return;
    }

    try {
      // Вставляем голос
      const { error: voteError } = await supabase
        .from('votes')
        .insert({ user_id: user.id, chapter_id: chapterId });

      if (voteError) throw voteError;

      // Обновляем количество голосов в опции
      const { error: updateError } = await supabase
        .from('options')
        .update({ votes: currentVotes + 1 })
        .eq('id', optionId);

      if (updateError) throw updateError;

      // Обновляем локальное состояние
      setVotedChapters(prev => new Set(prev).add(chapterId));
      
      setChapters(prevChapters => 
        prevChapters.map(ch => {
          if (ch.id === chapterId) {
            return {
              ...ch,
              options: ch.options.map((opt: any) => 
                opt.id === optionId 
                  ? { ...opt, votes: opt.votes + 1 }
                  : opt
              )
            };
          }
          return ch;
        })
      );
    } catch (error) {
      console.error('Ошибка голосования:', error);
      alert('Не удалось проголосовать');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A] p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-200 dark:bg-gray-800 h-40 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
            За последние 24 часа новых глав нет
          </h2>
          <p className="text-slate-500 dark:text-gray-400 mb-6">
            Загляните позже или перейдите в каталог
          </p>
          <button
            onClick={() => router.back()}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentIndex];
  const isVoteActive = canVote(currentChapter);
  const hasVoted = votedChapters.has(currentChapter.id);
  const totalVotes = currentChapter.options?.reduce((sum: number, o: any) => sum + o.votes, 0) || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      {/* ВЕРХНЯЯ ПАНЕЛЬ С КНОПКОЙ НАЗАД */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-slate-600 dark:text-gray-400 hover:text-blue-600 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-medium">Назад</span>
          </button>
        </div>
      </div>

      {/* Контейнер с обработкой тапов */}
      <div 
        ref={contentRef}
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Подсказка при первом использовании */}
        {showTooltip && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-bounce">
            👆 Двойной тап для следующей главы
          </div>
        )}

        {/* Шапка с информацией об авторе и истории */}
        <div className="sticky top-[57px] z-10 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Аватар автора */}
              <Link href={`/profile/${currentChapter.story.author_id}`}>
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 overflow-hidden border-2 border-white dark:border-gray-800">
                  {currentChapter.story.profiles?.avatar_url ? (
                    <img 
                      src={currentChapter.story.profiles.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-gray-400 font-bold text-lg">
                      {currentChapter.story.profiles?.pseudonym?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </Link>

              {/* Название истории со стрелкой */}
              <Link 
                href={`/story/${currentChapter.story.id}`}
                className="flex items-center gap-1 flex-1 group"
              >
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition line-clamp-1">
                  {currentChapter.story.title}
                </span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5"
                  className="text-slate-400 group-hover:text-blue-600 transition flex-shrink-0"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {/* Сердечко избранного */}
            <button
              onClick={(e) => toggleFavorite(e, currentChapter.story.id)}
              className={`p-2 transition-colors flex-shrink-0 ${
                favorites.has(currentChapter.story.id) 
                  ? 'text-red-500' 
                  : 'text-slate-300 dark:text-gray-600 hover:text-red-400'
              }`}
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill={favorites.has(currentChapter.story.id) ? "currentColor" : "none"} 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Контент главы */}
        <div className="px-4 py-6 pb-20">
          {/* Заголовок главы */}
          <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
            Глава {currentChapter.chapter_number}: {currentChapter.title}
          </h2>
          
          {/* Текст главы */}
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {currentChapter.content?.split('\n').map((paragraph: string, i: number) => (
              <p key={i} className="mb-4 text-slate-700 dark:text-gray-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Вопрос для голосования (если есть) */}
          {currentChapter.question_text && (
            <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {currentChapter.question_text}
                </h3>
              </div>
              
              {/* КОНТЕЙНЕР ДЛЯ ОПЦИЙ - как на странице истории */}
              <div className="space-y-4">
                {currentChapter.options?.map((opt: any, index: number) => {
                  const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                  const canUserVote = isVoteActive && !hasVoted && user;
                  const hasVotes = opt.votes > 0;

                  return (
                    <div key={opt.id} className="space-y-3">
                      {/* ОСНОВНАЯ КАРТОЧКА ОПЦИИ */}
                      <div className={`relative rounded-xl border transition-all ${
                        canUserVote 
                          ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800 cursor-pointer' 
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-gray-800/50'
                      } ${!canUserVote ? 'opacity-80' : ''}`}>
                        
                        {/* ВЕРХНЯЯ ЧАСТЬ - ТЕКСТ И ПРОЦЕНТЫ */}
                        <div className="p-4">
                          <div className="flex justify-between items-center gap-4">
                            {/* ТЕКСТ ОПЦИИ */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                  index === 0 ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400' :
                                  index === 1 ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' :
                                  index === 2 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                                  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                }`}>
                                  Вариант {index + 1}
                                </span>
                              </div>
                              <p className="text-slate-900 dark:text-white font-medium">
                                {opt.text}
                              </p>
                            </div>
                            
                            {/* ПРАВАЯ ЧАСТЬ: ПРОЦЕНТЫ (десктоп) */}
                            <div className="hidden sm:flex items-center gap-3">
                              {(hasVoted || !isVoteActive) && totalVotes > 0 && (
                                <div className="text-right min-w-[70px]">
                                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                                    {percentage}%
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* ПОЛОСКА ПРОГРЕССА (если голосовали) */}
                          {(hasVoted || !isVoteActive) && hasVotes && (
                            <div className="mt-4">
                              <div className="h-2 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    index === 0 ? 'bg-blue-500' :
                                    index === 1 ? 'bg-green-500' :
                                    index === 2 ? 'bg-purple-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* НИЖНЯЯ ЧАСТЬ ДЛЯ МОБИЛЬНОЙ ВЕРСИИ */}
                          <div className="mt-4 sm:hidden space-y-3">
                            {/* ПРОЦЕНТЫ НА МОБИЛЬНЫХ (если голосовали) */}
                            {(hasVoted || !isVoteActive) && totalVotes > 0 && (
                              <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 dark:text-white">
                                  {percentage}%
                                </div>
                                <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                  голосов
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* КНОПКА ГОЛОСОВАНИЯ (если можно голосовать) */}
                        {canUserVote && (
                          <div className="border-t border-slate-100 dark:border-gray-700 p-4">
                            <button 
                              onClick={() => handleVote(opt.id, currentChapter.id, opt.votes)}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-bold transition-colors shadow-sm"
                            >
                              Проголосовать
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Сообщение после голосования */}
              {hasVoted && (
                <p className="text-center text-xs text-slate-500 dark:text-gray-400 mt-4">
                  Дополнительное голосование доступно на основной странице истории
                </p>
              )}

              {!user && isVoteActive && (
                <p className="text-center text-xs text-slate-500 dark:text-gray-400 mt-4">
                  <Link href="/auth" className="text-blue-600 dark:text-blue-400 font-bold underline">
                    Войдите
                  </Link>, чтобы голосовать
                </p>
              )}
            </div>
          )}
        </div>

        {/* Кнопка для перехода к следующей главе (вручную) */}
        {currentIndex < chapters.length - 1 && (
          <div className="sticky bottom-4 flex justify-center px-4 pb-4">
            <button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition"
            >
              <span>Следующая глава</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ПРОГРЕСС-БАР ВНИЗУ */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-sm border-t border-slate-200 dark:border-gray-800 py-2 px-4">
          <div className="flex justify-center items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">
              {currentIndex + 1} / {chapters.length}
            </span>
            <div className="w-32 h-1 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Отступ для прогресс-бара */}
      <div className="h-12"></div>
    </div>
  );
}