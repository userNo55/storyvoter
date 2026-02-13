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
  const contentRef = useRef<HTMLDivElement>(null);
  
  // ИСПРАВЛЕНО: инициализируем useRef с undefined
  const touchTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // ИСПРАВЛЕНО: добавляем флаг для отслеживания двойного тапа
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

      // Если пользователь авторизован, загружаем его избранное
      if (user) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('story_id')
          .eq('user_id', user.id);
        
        setFavorites(new Set(favs?.map(f => f.story_id) || []));
      }

      setLoading(false);
    }

    loadFeed();
  }, []);

  // Обработка двойного тапа для перехода к следующей главе
  const handleDoubleTap = () => {
    if (currentIndex < chapters.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Показываем подсказку при первом использовании
      if (!localStorage.getItem('feed_tooltip_shown')) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
        localStorage.setItem('feed_tooltip_shown', 'true');
      }
    }
  };

  // ИСПРАВЛЕНО: новая логика обработки тапов
  const handleTap = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Проверяем, не был ли клик по интерактивному элементу
    if (target.closest('a, button')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms между тапами

    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      // Это двойной тап
      handleDoubleTap();
      lastTapRef.current = 0; // Сбрасываем после двойного тапа
    } else {
      // Это первый тап
      lastTapRef.current = now;
      
      // Сбрасываем через 300ms если не было второго тапа
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
    
    // Если движение было небольшим (тап, а не свайп)
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

    // Оптимистичное обновление UI
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFavorite) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });

    // Запрос к БД
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
          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentIndex];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      {/* Индикатор прогресса */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-sm border-b border-slate-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-medium text-slate-600 dark:text-gray-400">
            {currentIndex + 1} / {chapters.length}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Двойной тап → след. глава
            </span>
          </div>
        </div>
        {/* Прогресс-бар */}
        <div className="h-1 bg-slate-100 dark:bg-gray-800">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
          />
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
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                  {currentChapter.story.title}
                </span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5"
                  className="text-slate-400 group-hover:text-blue-600 transition"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {/* Сердечко избранного */}
            <button
              onClick={(e) => toggleFavorite(e, currentChapter.story.id)}
              className={`p-2 transition-colors ${
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
            {currentChapter.content.split('\n').map((paragraph: string, i: number) => (
              <p key={i} className="mb-4 text-slate-700 dark:text-gray-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Вопрос для голосования (если есть) */}
          {currentChapter.question_text && (
            <div className="mt-8 p-6 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
                {currentChapter.question_text}
              </h3>
              <div className="space-y-3">
                {currentChapter.options?.map((opt: any) => (
                  <button
                    key={opt.id}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                    disabled
                  >
                    <span className="text-slate-900 dark:text-white">{opt.text}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-4 text-center">
                Голосование доступно на странице истории
              </p>
            </div>
          )}
        </div>

        {/* Кнопка для перехода к следующей главе (вручную) */}
        {currentIndex < chapters.length - 1 && (
          <div className="sticky bottom-20 flex justify-center px-4 pb-4">
            <button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
            >
              <span>Следующая глава</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Нижняя навигация (мобильная) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0A0A0A] border-t border-slate-200 dark:border-gray-800 px-6 py-3">
        <div className="flex justify-around items-center">
          <Link href="/" className="flex flex-col items-center text-slate-400 dark:text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span className="text-xs mt-1">Главная</span>
          </Link>
          
          <Link href="/feed" className="flex flex-col items-center text-blue-600 dark:text-blue-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
            <span className="text-xs mt-1">Новое</span>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center text-slate-400 dark:text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-xs mt-1">Профиль</span>
          </Link>
        </div>
      </div>
    </div>
  );
}