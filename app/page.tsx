'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import Link from 'next/link';
import { FaRegClock } from 'react-icons/fa';

export default function HomePage() {
  const [stories, setStories] = useState<any[]>([]);
  const [filteredStories, setFilteredStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'new' | 'updated' | 'engagement' | 'archived'>('new');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function loadData() {
    setLoading(true);
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

    // Загружаем истории с последним обновлением главы
    let query = supabase
      .from('stories')
      .select(`
        *, 
        profiles(pseudonym), 
        chapters(id, expires_at, chapter_number, created_at),
        favorites(user_id)
      `)
      .filter('favorites.user_id', 'eq', user?.id || '00000000-0000-0000-0000-000000000000');

    const { data } = await query;
    
    // Добавляем поле last_updated для сортировки
    const storiesWithLastUpdate = (data || []).map(story => {
      const lastChapter = story.chapters 
        ? [...story.chapters].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        : null;
      
      return {
        ...story,
        last_updated: lastChapter?.created_at || story.created_at,
        is_completed: story.is_completed || false
      };
    });

    setStories(storiesWithLastUpdate);
    setCurrentIndex(0);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Фильтрация и сортировка историй
  useEffect(() => {
    let result = [...stories];
    
    // Фильтр избранного
    if (showFavoritesOnly) {
      result = result.filter(s => s.favorites && s.favorites.length > 0);
    }
    
    // Фильтр активных/завершенных
    if (showActiveOnly) {
      result = result.filter(story => !story.is_completed);
    }
    
    // Сортировка
    result.sort((a, b) => {
      switch(sortOrder) {
        case 'new':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        case 'updated':
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        
        case 'engagement':
          return (b.engagement || 0) - (a.engagement || 0);
        
        case 'archived':
          // Завершенные в конце
          if (a.is_completed && !b.is_completed) return 1;
          if (!a.is_completed && b.is_completed) return -1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        default:
          return 0;
      }
    });
    
    setFilteredStories(result);
    setCurrentIndex(0); // Сбрасываем индекс при изменении фильтров
  }, [stories, showFavoritesOnly, showActiveOnly, sortOrder]);

  const toggleFavorite = async (e: React.MouseEvent, storyId: string, isFav: boolean) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!userId) return alert("Войдите, чтобы добавлять в избранное");

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

    // Обновляем локальное состояние
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
  };

  // Обработчики свайпов
  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (filteredStories.length === 0) return;
    
    setSwipeDirection(direction);
    
    // Если свайп вправо - добавляем в избранное
    if (direction === 'right' && userId && currentIndex < filteredStories.length) {
      const currentStory = filteredStories[currentIndex];
      const isFav = currentStory.favorites && currentStory.favorites.length > 0;
      
      if (!isFav) {
        toggleFavorite({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, 
                      currentStory.id, false);
      }
    }
    
    // Переходим к следующей истории через 300ms (время анимации)
    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < filteredStories.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Если дошли до конца, показываем сообщение
        setCurrentIndex(filteredStories.length); // Индекс за пределами массива
      }
    }, 300);
  }, [filteredStories, currentIndex, userId]);

  // Обработка касаний для свайпов
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Минимальное расстояние для свайпа
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleSwipe('left');
    }
    
    if (isRightSwipe) {
      handleSwipe('right');
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isMobile) return; // На десктопе обычное поведение
    e.preventDefault();
    
    // Открываем историю при тапе на карточку
    if (currentIndex < filteredStories.length) {
      const story = filteredStories[currentIndex];
      window.location.href = `/story/${story.id}`;
    }
  };

  // Кнопки для управления свайпами (на случай если свайпы не работают)
  const skipStory = () => handleSwipe('left');
  const favoriteStory = () => handleSwipe('right');

  const currentStory = currentIndex < filteredStories.length ? filteredStories[currentIndex] : null;
  const isFavorite = currentStory?.favorites && currentStory.favorites.length > 0;
  const isCompleted = currentStory?.is_completed;

  // Компонент Tinder-карточки
  const TinderCard = () => {
    if (!currentStory) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
          <div className="text-6xl mb-6">📚</div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Истории закончились!
          </h3>
          <p className="text-slate-500 dark:text-gray-400 mb-8">
            {showFavoritesOnly 
              ? "В избранном больше нет историй" 
              : "Вы просмотрели все доступные истории"}
          </p>
          <button 
            onClick={() => setCurrentIndex(0)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition"
          >
            Начать сначала
          </button>
        </div>
      );
    }

    return (
      <div 
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`
          relative w-full max-w-md mx-auto bg-white dark:bg-[#1A1A1A] 
          border-2 border-slate-200 dark:border-gray-800 
          rounded-[32px] p-8 shadow-xl cursor-pointer touch-pan-y
          transition-all duration-300 transform
          ${swipeDirection === 'left' 
            ? '-translate-x-full opacity-0' 
            : swipeDirection === 'right' 
            ? 'translate-x-full opacity-0' 
            : ''
          }
          ${isFavorite ? 'border-red-200 dark:border-red-800' : ''}
          hover:border-blue-500 dark:hover:border-blue-500
          select-none
        `}
      >
        {/* Индикатор свайпа */}
        {swipeDirection && (
          <div className={`
            absolute inset-0 rounded-[32px] flex items-center justify-center z-10
            ${swipeDirection === 'right' 
              ? 'bg-red-500/10 border-2 border-red-500' 
              : 'bg-blue-500/10 border-2 border-blue-500'
            }
          `}>
            <span className={`
              text-4xl font-black
              ${swipeDirection === 'right' ? 'text-red-500' : 'text-blue-500'}
            `}>
              {swipeDirection === 'right' ? '❤️ В избранное!' : '➡️ Пропустить'}
            </span>
          </div>
        )}

        {/* Заголовок и метаинформация */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full text-slate-500 dark:text-gray-400">
              {currentStory.age_rating || '16+'}
            </span>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(e, currentStory.id, isFavorite);
              }}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                isFavorite 
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30' 
                  : 'text-slate-300 dark:text-gray-600 hover:text-red-400 bg-white dark:bg-gray-800'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            {isCompleted && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30 px-2 py-1 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </span>
            )}
            
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full uppercase">
              ⚡ {currentStory.engagement || 0}
            </span>
            
            <span className="text-[10px] font-bold text-blue-500 bg-slate-100 dark:bg-blue-950/30 px-3 py-1 rounded-full uppercase">
              ГЛАВ: {currentStory.chapters?.length || 0} 
            </span>
          </div>
        </div>

        {/* Заголовок истории */}
        <h2 className="text-2xl font-bold mb-4 leading-tight text-slate-900 dark:text-white line-clamp-2">
          {currentStory.title}
        </h2>
        
        {/* Описание */}
        <p className="text-slate-400 dark:text-gray-500 text-sm mb-8 line-clamp-4 italic leading-relaxed">
          {currentStory.description || 'Описание отсутствует...'}
        </p>

        {/* Автор и кнопка */}
        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {currentStory.profiles?.pseudonym || 'Анонимный автор'}
            </span>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-gray-800 flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>

        {/* Подсказки свайпа */}
        <div className="mt-8 flex justify-between items-center text-xs text-slate-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 bg-blue-500 rounded-full"></div>
            <span>Свайп влево</span>
          </div>
          <span>Нажмите, чтобы открыть</span>
          <div className="flex items-center gap-2">
            <span>Свайп вправо</span>
            <div className="w-10 h-1 bg-red-500 rounded-full"></div>
          </div>
        </div>

        {/* Кнопки управления для тестирования */}
        <div className="mt-6 flex justify-center gap-4 md:hidden">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              skipStory();
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-xl font-bold text-sm"
          >
            Пропустить
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              favoriteStory();
            }}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-bold text-sm"
          >
            В избранное
          </button>
        </div>
      </div>
    );
  };

  // Десктопный вид (список)
  const DesktopView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {filteredStories.map((story) => {
        const isFavorite = story.favorites && story.favorites.length > 0;
        const isCompleted = story.is_completed;

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
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/30 px-2 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </span>
                )}
                
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
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {story.profiles?.pseudonym || 'Анонимный автор'}
                </span>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-gray-800 flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  // Фильтры для мобильного вида
  const MobileFilters = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0A0A0A] border-t border-slate-200 dark:border-gray-800 p-4 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center gap-2">
          <button 
            onClick={() => setSortOrder('new')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              sortOrder === 'new' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
            }`}
          >
            Новые
          </button>
          
          <button 
            onClick={() => setSortOrder('updated')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              sortOrder === 'updated' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
            }`}
          >
            Обновлено
          </button>
          
          <button 
            onClick={() => setSortOrder('archived')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              sortOrder === 'archived' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
            }`}
          >
            Архив
          </button>
        </div>
        
        <div className="flex justify-center gap-4 mt-4">
          <button 
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              showActiveOnly 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
            }`}
          >
            <FaRegClock />
            Активные
          </button>
          
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              showFavoritesOnly 
                ? 'bg-red-600 text-white' 
                : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Избранное
          </button>
        </div>
        
        {/* Прогресс просмотра */}
        {filteredStories.length > 0 && currentIndex < filteredStories.length && (
          <div className="mt-4">
            <div className="text-xs text-slate-400 dark:text-gray-500 mb-1">
              Просмотрено: {currentIndex} из {filteredStories.length}
            </div>
            <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentIndex / filteredStories.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] transition-colors duration-300">
      <main className="max-w-5xl mx-auto p-4 md:p-6 font-sans pb-24 md:pb-6">
        
        {/* Шапка */}
        <header className="flex justify-between items-center mb-6 md:mb-12 py-4 md:py-6 border-b border-slate-100 dark:border-gray-800">
          <Link href="/">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Vilka</h1>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            {userNickname ? (
              <>
                {/* Фильтры для десктопа */}
                <div className="hidden md:flex items-center bg-slate-50 dark:bg-[#1A1A1A] p-1 rounded-full border border-slate-100 dark:border-gray-800">
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'new' ? 'engagement' : 'new')}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      sortOrder === 'engagement' 
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50'
                        : 'bg-transparent text-slate-400 hover:text-orange-500'
                    }`}
                    title="Сортировка"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </button>

                  <button 
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      showActiveOnly 
                        ? 'text-green-500 bg-green-50 dark:bg-green-950/30' 
                        : 'bg-transparent text-slate-400 hover:text-green-500'
                    }`}
                    title="Активные истории"
                  >
                    <FaRegClock className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      showFavoritesOnly 
                        ? 'text-red-500' 
                        : 'bg-transparent text-slate-400 hover:text-red-500'
                    }`}
                    title="Избранное"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                <Link 
                  href="/dashboard" 
                  className="hidden md:flex items-center text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Мои книги"
                >
                  <span className="text-sm font-bold">Мои книги</span>
                </Link>
                
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-gray-200 truncate max-w-[80px] md:max-w-none">
                    {userNickname}
                  </span>
                </Link>
              </>
            ) : (
              <Link href="/auth" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 md:px-6 md:py-2.5 rounded-full text-xs md:text-sm font-bold">
                Войти
              </Link>
            )}
          </div>
        </header>

        {/* Загрузка */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 dark:text-gray-600 font-bold animate-pulse">
            Загрузка...
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-[#1A1A1A] rounded-[40px] border border-slate-100 dark:border-gray-800">
            <p className="text-slate-400 dark:text-gray-500 font-medium">
              {showFavoritesOnly ? "В избранном пока пусто." : 
               showActiveOnly ? "Активных историй пока нет." : 
               "Книг пока нет."}
            </p>
            <button 
              onClick={() => {
                setShowFavoritesOnly(false);
                setShowActiveOnly(false);
                setSortOrder('new');
              }} 
              className="mt-4 text-blue-600 dark:text-blue-400 font-bold text-sm underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Показать всё
            </button>
          </div>
        ) : (
          <>
            {/* Мобильный Tinder-вид */}
            {isMobile ? (
              <div className="relative h-[70vh] flex items-center justify-center">
                <TinderCard />
              </div>
            ) : (
              // Десктопный список
              <DesktopView />
            )}
          </>
        )}
      </main>

      {/* Мобильные фильтры */}
      {isMobile && !loading && filteredStories.length > 0 && <MobileFilters />}
    </div>
  );
}