'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase';
import Link from 'next/link';
import { FaRegClock } from 'react-icons/fa';

type Story = {
  id: string;
  title: string;
  description: string;
  age_rating: string;
  engagement: number;
  is_completed: boolean;
  created_at: string;
  profiles: { pseudonym: string };
  chapters: any[];
  favorites: { user_id: string }[];
};

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'new' | 'engagement'>('new');
  
  // Состояния для свайпа
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [cardStack, setCardStack] = useState<Story[]>([]);
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

    let query = supabase
      .from('stories')
      .select(`
        *, 
        profiles(pseudonym), 
        chapters(id, expires_at, chapter_number),
        favorites(user_id)
      `)
      .filter('favorites.user_id', 'eq', user?.id || '00000000-0000-0000-0000-000000000000');

    if (sortOrder === 'new') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('engagement', { ascending: false });
    }

    const { data } = await query;
    setStories(data || []);
    setCardStack(data || []);
    setCurrentIndex(0);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [sortOrder]);

  // Фильтрация историй
  const displayedStories = showFavoritesOnly 
    ? stories.filter(s => s.favorites && s.favorites.length > 0)
    : stories.filter(story => {
        if (showActiveOnly && story.is_completed) {
          return false;
        }
        return true;
      });

  // Обновляем стек карточек при фильтрации
  useEffect(() => {
    setCardStack(displayedStories);
    setCurrentIndex(0);
  }, [displayedStories]);

  const toggleFavorite = async (e: React.MouseEvent, storyId: string, isFav: boolean) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!userId) {
      alert("Войдите, чтобы добавлять в избранное");
      return;
    }

    // Локальное обновление состояния
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

    // Обновление стека карточек
    setCardStack(prevStack => 
      prevStack.map(story => {
        if (story.id === storyId) {
          return {
            ...story,
            favorites: isFav ? [] : [{ user_id: userId }]
          };
        }
        return story;
      })
    );

    // API запрос
    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: userId, story_id: storyId });
      if (error) { 
        console.error(error); 
        loadData(); 
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, story_id: storyId });
      if (error) { 
        console.error(error); 
        loadData(); 
      }
    }
  };

  // Обработчик свайпа
  const handleSwipe = useCallback((direction: 'left' | 'right', storyId?: string) => {
    if (cardStack.length === 0) return;
    
    const storyToSwipe = storyId 
      ? cardStack.find(s => s.id === storyId)
      : cardStack[currentIndex];
    
    if (!storyToSwipe) return;
    
    // Если свайп вправо - добавляем в избранное
    if (direction === 'right' && userId) {
      const isFavorite = storyToSwipe.favorites && storyToSwipe.favorites.length > 0;
      if (!isFavorite) {
        // Создаем фиктивный event для toggleFavorite
        const dummyEvent = {
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.MouseEvent;
        
        toggleFavorite(dummyEvent, storyToSwipe.id, false);
      }
    }
    
    // Устанавливаем направление для анимации
    setSwipeDirection(direction);
    
    // Через 300ms убираем карточку
    setTimeout(() => {
      if (currentIndex < cardStack.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Если карточки закончились, начинаем сначала
        setCurrentIndex(0);
      }
      setSwipeDirection(null);
    }, 300);
  }, [cardStack, currentIndex, userId]);

  // Обработчик окончания drag
  const handleDragEnd = useCallback((_: any, info: any) => {
    const SWIPE_THRESHOLD = 100;
    const SWIPE_VELOCITY = 500;
    
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    
    let direction: 'left' | 'right' | null = null;
    
    if (Math.abs(offsetX) > SWIPE_THRESHOLD || Math.abs(velocityX) > SWIPE_VELOCITY) {
      direction = offsetX > 0 ? 'right' : 'left';
    }
    
    if (direction) {
      handleSwipe(direction);
    }
  }, [handleSwipe]);

  // Пропустить карточку (кнопка)
  const skipCard = () => {
    handleSwipe('left');
  };

  // Добавить в избранное (кнопка)
  const favoriteCard = () => {
    handleSwipe('right');
  };

  // Вернуться к предыдущей карточке
  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(cardStack.length - 1);
    }
  };

  // Компонент Tinder-карточки
  const TinderCard = ({ story, isActive }: { 
    story: Story; 
    isActive: boolean;
  }) => {
    const [dragStartX, setDragStartX] = useState(0);
    const isFavorite = story?.favorites && story.favorites.length > 0;
    const isCompleted = story?.is_completed;
    
    if (!story) return null;

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ 
          scale: isActive ? 1 : 0.92,
          opacity: isActive ? 1 : 0.7,
          y: isActive ? 0 : 10,
          rotate: isActive ? 0 : (isActive ? 0 : Math.random() * 4 - 2)
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25,
          delay: isActive ? 0 : 0.1
        }}
        className={`absolute w-full max-w-md ${isActive ? 'z-30 cursor-grab active:cursor-grabbing' : 'z-20'}`}
        style={{
          top: isActive ? '0%' : `${isActive ? 0 : 20}px`,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <motion.div
          drag={isActive ? "x" : false}
          dragConstraints={{ left: -300, right: 300 }}
          dragElastic={0.8}
          onDragStart={(_: any, info: any) => setDragStartX(info.point.x)}
          onDragEnd={isActive ? handleDragEnd : undefined}
          animate={{
            x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0,
            rotate: swipeDirection === 'left' ? -30 : swipeDirection === 'right' ? 30 : 0,
            transition: swipeDirection ? { duration: 0.3 } : {}
          }}
          whileTap={isActive ? { scale: 0.98 } : {}}
          className="bg-white dark:bg-[#1A1A1A] border-2 border-slate-200 dark:border-gray-800 rounded-[32px] p-8 shadow-xl hover:border-blue-500 dark:hover:border-blue-500 select-none"
          onClick={() => {
            if (isActive && !dragStartX) {
              window.location.href = `/story/${story.id}`;
            }
          }}
        >
          {/* Индикаторы свайпа */}
          {isActive && (
            <>
              <motion.div 
                className="absolute top-6 left-6 text-green-500 text-sm font-bold"
                animate={{ 
                  opacity: dragStartX > 50 ? 0.8 : 0,
                  x: dragStartX > 50 ? 0 : -20 
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>В избранное</span>
                </div>
              </motion.div>
              
              <motion.div 
                className="absolute top-6 right-6 text-slate-400 text-sm font-bold"
                animate={{ 
                  opacity: dragStartX < -50 ? 0.8 : 0,
                  x: dragStartX < -50 ? 0 : 20 
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span>Пропустить</span>
                </div>
              </motion.div>
            </>
          )}

          {/* Заголовок и метаинформация */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full text-slate-500 dark:text-gray-400">
                {story.age_rating || '16+'}
              </span>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(e, story.id, isFavorite);
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
                ⚡ {story.engagement || 0}
              </span>
              
              <span className="text-[10px] font-bold text-blue-500 bg-slate-100 dark:bg-blue-950/30 px-3 py-1 rounded-full uppercase">
                ГЛАВ: {story.chapters?.length || 0} 
              </span>
            </div>
          </div>

          {/* Заголовок истории */}
          <h2 className="text-2xl font-bold mb-4 leading-tight text-slate-900 dark:text-white line-clamp-2">
            {story.title}
          </h2>
          
          {/* Описание */}
          <p className="text-slate-400 dark:text-gray-500 text-sm mb-8 line-clamp-4 italic leading-relaxed">
            {story.description || 'Описание отсутствует...'}
          </p>

          {/* Автор и кнопка */}
          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {story.profiles?.pseudonym || 'Анонимный автор'}
              </span>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-gray-800 flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Компонент списка для десктопа
  const StoriesList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {displayedStories.map((story) => {
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

  // Кнопки управления для мобильных
  const MobileControls = () => (
    <div className="fixed bottom-8 left-0 right-0 z-50 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-center items-center gap-8 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-gray-800 p-4 shadow-lg">
          {/* Кнопка назад */}
          <button 
            onClick={goBack}
            className="p-3 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-400 hover:text-blue-500 transition"
            title="Вернуться назад"
            disabled={cardStack.length <= 1}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          
          {/* Кнопка пропуска */}
          <button 
            onClick={skipCard}
            className="p-4 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition"
            title="Пропустить"
            disabled={cardStack.length === 0}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          
          {/* Кнопка избранного */}
          <button 
            onClick={favoriteCard}
            className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 transition"
            title="В избранное"
            disabled={cardStack.length === 0}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          
          {/* Информация о прогрессе */}
          <div className="text-xs font-bold text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
            {cardStack.length > 0 ? `${currentIndex + 1} / ${cardStack.length}` : '0 / 0'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] transition-colors duration-300">
      <main className="max-w-5xl mx-auto p-4 md:p-6 font-sans pb-28 md:pb-6">
        
        {/* Шапка */}
        <header className="flex justify-between items-center mb-6 md:mb-12 py-4 md:py-6 border-b border-slate-100 dark:border-gray-800">
          <Link href="/">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase 
              bg-[url('/favicon.png')] bg-cover bg-center bg-clip-text text-transparent">
              Vilka
            </h1>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
            {userNickname ? (
              <>
                <div className="hidden md:flex items-center bg-slate-50 dark:bg-[#1A1A1A] p-0.5 md:p-1 rounded-full border border-slate-100 dark:border-gray-800 scale-90 md:scale-100">
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
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      showActiveOnly 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-900/50'
                        : 'bg-transparent text-slate-400 hover:text-green-500'
                    }`}
                    title={showActiveOnly ? "Показать все истории" : "Показать только активные"}
                  >
                    <FaRegClock className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      showFavoritesOnly 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-900/50'
                        : 'bg-transparent text-slate-400 hover:text-red-500'
                    }`}
                    title={showFavoritesOnly ? "Показать все истории" : "Показать избранное"}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        {loading ? (
          <div className="text-center py-20 text-slate-400 dark:text-gray-600 font-bold animate-pulse">Загрузка...</div>
        ) : displayedStories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-[#1A1A1A] rounded-[40px] border border-slate-100 dark:border-gray-800">
            <p className="text-slate-400 dark:text-gray-500 font-medium">
              {showFavoritesOnly ? "В избранном пока пусто." : 
               showActiveOnly ? "Активных историй пока нет." : 
               "Книг пока нет."}
            </p>
            {showFavoritesOnly && (
              <button onClick={() => setShowFavoritesOnly(false)} className="mt-4 text-blue-600 dark:text-blue-400 font-bold text-sm underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                Показать всё
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Мобильный Tinder-вид или десктопный список */}
            {isMobile ? (
              <div className="relative h-[70vh] flex items-center justify-center">
                <AnimatePresence>
                  {/* Показываем 3 верхние карточки */}
                  {cardStack.slice(currentIndex, currentIndex + 3).map((story, index) => (
                    <TinderCard
                      key={story.id}
                      story={story}
                      isActive={index === 0}
                    />
                  ))}
                </AnimatePresence>
                
                {/* Сообщение когда карточки закончились */}
                {cardStack.length === 0 && (
                  <div className="text-center text-slate-400 dark:text-gray-500">
                    <p className="text-lg font-bold mb-2">Все карточки просмотрены!</p>
                    <button 
                      onClick={() => setCurrentIndex(0)}
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      Начать сначала
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <StoriesList />
            )}
          </>
        )}
      </main>

      {/* Мобильные контролы */}
      {isMobile && !loading && cardStack.length > 0 && <MobileControls />}
    </div>
  );
}