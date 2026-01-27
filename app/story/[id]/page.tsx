'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- КОМПОНЕНТ ТАЙМЕРА ---
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expireTime = new Date(expiresAt).getTime();
      const distance = expireTime - now;

      if (isNaN(distance) || distance < 0) {
        setTimeLeft("Голосование завершено");
      } else {
        const h = Math.floor(distance / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`Осталось: ${h}ч ${m}м ${s}с`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="text-orange-500 font-mono text-xs mb-4 text-center bg-orange-50 dark:bg-orange-950/30 py-2 rounded-xl border border-orange-100 dark:border-orange-800">
      {timeLeft}
    </div>
  );
}

// --- СКЕЛЕТОН КАРТОЧКИ ГЛАВЫ ---
function ChapterSkeleton() {
  return (
    <div className="border rounded-[24px] overflow-hidden border-slate-200 dark:border-gray-800 animate-pulse">
      <div className="flex justify-between items-center bg-white dark:bg-[#1A1A1A] p-6">
        <div className="flex-1">
          <div className="h-6 w-1/2 bg-slate-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-1/4 bg-slate-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-8 h-8 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [votedChapters, setVotedChapters] = useState<string[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Функция для получения сохраненной открытой главы из localStorage
  const getSavedOpenChapter = () => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(`openChapter_${id}`);
    return saved || null;
  };

  // Функция для сохранения открытой главы в localStorage
  const saveOpenChapter = (chapterId: string | null) => {
    if (typeof window === 'undefined') return;
    if (chapterId) {
      localStorage.setItem(`openChapter_${id}`, chapterId);
    } else {
      localStorage.removeItem(`openChapter_${id}`);
    }
  };

  // Находим последнюю главу с активным голосованием
  const findLatestVotableChapter = (chapters: any[]) => {
    if (chapters.length === 0) return null;
    
    // Сортируем по номеру главы (от большего к меньшему)
    const sortedChapters = [...chapters].sort((a, b) => b.chapter_number - a.chapter_number);
    
    // Ищем первую главу с активным голосованием (не истекшим)
    for (const chapter of sortedChapters) {
      const isExpired = new Date(chapter.expires_at).getTime() < new Date().getTime();
      if (!isExpired) {
        return chapter.id;
      }
    }
    
    // Если нет глав с активным голосованием, возвращаем null
    return null;
  };

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        // Получаем пользователя
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Параллельные запросы для данных пользователя и истории
        const [
          profilePromise,
          votesPromise,
          storyPromise,
          chaptersPromise
        ] = await Promise.all([
          user ? supabase.from('profiles').select('coins').eq('id', user.id).single() : Promise.resolve({ data: null }),
          user ? supabase.from('votes').select('chapter_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
          supabase.from('stories').select('*, profiles(*)').eq('id', id).single(),
          supabase.from('chapters').select('*, options(*)').eq('story_id', id).order('chapter_number', { ascending: true })
        ]);

        // Обработка результатов
        const profileData = profilePromise.data;
        const votesData = votesPromise.data;
        const storyData = storyPromise.data;
        const chaptersData = chaptersPromise.data;

        setUserCoins(profileData?.coins || 0);
        setVotedChapters(votesData?.map((item: any) => item.chapter_id) || []);
        setStory(storyData);
        setChapters(chaptersData || []);

        // Логика определения, какую главу открыть по умолчанию:
        // 1. Сначала проверяем сохраненную главу из localStorage
        const savedOpenChapter = getSavedOpenChapter();
        if (savedOpenChapter) {
          setOpenChapter(savedOpenChapter);
        } else {
          // 2. Если нет сохраненной, находим последнюю главу с активным голосованием
          const latestVotableChapterId = findLatestVotableChapter(chaptersData || []);
          if (latestVotableChapterId) {
            setOpenChapter(latestVotableChapterId);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  // Проверка является ли пользователь автором
  const isAuthor = user && story && story.author_id === user.id;

  // Обновляем функцию обработки клика по главе
  const handleChapterClick = (chapterId: string) => {
    const newOpenChapter = openChapter === chapterId ? null : chapterId;
    setOpenChapter(newOpenChapter);
    saveOpenChapter(newOpenChapter);
  };

  // Обычное бесплатное голосование (вес 1)
  const handleVote = async (chapterId: string, optionId: string, currentVotes: number) => {
    if (!user) return router.push('/auth');
    const { error } = await supabase.from('votes').insert({ user_id: user.id, chapter_id: chapterId });
    if (error) return alert("Вы уже голосовали!");

    await supabase.from('options').update({ votes: currentVotes + 1 }).eq('id', optionId);
    
    // Сохраняем ID главы перед обновлением
    saveOpenChapter(chapterId);
    window.location.reload();
  };

  // Платное голосование (вес 3)
  const handlePaidVote = async (chapterId: string, optionId: string) => {
    if (userCoins < 1) return router.push('/buy');
    
    const { error } = await supabase.rpc('vote_with_coin', {
      user_id_param: user.id,
      option_id_param: optionId,
      chapter_id_param: chapterId
    });

    if (error) alert(error.message);
    else {
      // Сохраняем ID главы перед обновлением
      saveOpenChapter(chapterId);
      window.location.reload();
    }
  };

  // Удаление главы (доступно только автору и только для последней главы до окончания голосования)
  const handleDeleteChapter = async (chapterId: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt).getTime() < new Date().getTime();
    
    if (isExpired) {
      alert("Нельзя удалить главу после окончания голосования");
      return;
    }

    if (!confirm("Вы уверены, что хотите удалить эту главу? Это действие нельзя отменить.")) {
      return;
    }

    setDeleting(chapterId);

    try {
      // Удаляем только главу - связанные данные удалятся каскадно
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);
      
      if (error) {
        console.error("Ошибка при удалении главы:", error);
        throw error;
      }

      // Обновляем локальное состояние
      setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
      
      // Если удаляли открытую главу, закрываем её и очищаем сохраненное состояние
      if (openChapter === chapterId) {
        setOpenChapter(null);
        saveOpenChapter(null);
      }

      alert("Глава успешно удалена");
      
    } catch (error) {
      console.error("Ошибка при удалении главы:", error);
      alert("Произошла ошибка при удалении главы");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 font-sans bg-white dark:bg-[#0A0A0A] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
        {/* Скелетон хедера */}
        <header className="flex justify-between items-center mb-8 border-b pb-4 border-slate-100 dark:border-gray-800">
          <div className="h-6 w-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-40 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
        </header>

        {/* Скелетон заголовка */}
        <div className="h-12 bg-slate-200 dark:bg-gray-700 rounded mb-10 w-3/4"></div>

        {/* Скелетон блока автора */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 dark:bg-[#1A1A1A] rounded-[24px] border border-slate-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-gray-700"></div>
          <div className="flex-1">
            <div className="h-3 w-32 bg-slate-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-5 w-48 bg-slate-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>

        {/* Скелетон описания */}
        <div className="space-y-2 mb-10">
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>

        {/* Скелетоны глав */}
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <ChapterSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const latestChapterNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) : 0;

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans bg-white dark:bg-[#0A0A0A] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
      <header className="flex justify-between items-center mb-8 border-b pb-4 border-slate-100 dark:border-gray-800">
        <Link href="/" className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 transition-colors">← К списку</Link>
        {user && (
          <Link href="/buy" className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-4 py-1 rounded-full font-bold text-sm border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            Баланс: {userCoins} ⚡ <span className="ml-1 text-blue-400">+</span>
          </Link>
        )}
      </header>

      <h1 className="text-4xl font-black mb-10 text-slate-900 dark:text-white">{story.title}</h1>
      
      {/* --- БЛОК АВТОРА --- */}
      {story.profiles && (
        <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 dark:bg-[#1A1A1A] rounded-[24px] border border-slate-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-gray-700 overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
            {story.profiles.avatar_url ? (
              <img src={story.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-gray-400 font-bold">?</div>
            )}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-0.5">Автор истории</div>
            <div className="font-bold text-slate-900 dark:text-white">{story.profiles.pseudonym || 'Анонимный автор'}</div>
            {story.profiles.bio && <div className="text-sm text-slate-500 dark:text-gray-400 leading-tight mt-1">{story.profiles.bio}</div>}
          </div>
        </div>
      )}

      <p className="text-slate-500 dark:text-gray-400 text-lg mb-10 italic">{story.description}</p>

      <div className="space-y-6">
        {chapters.map((chapter) => {
          const isExpired = new Date(chapter.expires_at).getTime() < new Date().getTime();
          const hasVoted = votedChapters.includes(chapter.id);
          const isLatest = chapter.chapter_number === latestChapterNumber;
          const isLatestVotable = isLatest && !isExpired; // Последняя глава с активным голосованием
          const totalVotes = chapter.options?.reduce((sum: number, o: any) => sum + o.votes, 0) || 0;
          
          // Удаление доступно ТОЛЬКО для ПОСЛЕДНЕЙ главы И ТОЛЬКО до окончания голосования
          const canDelete = isAuthor && isLatest && !isExpired;

          return (
            <div key={chapter.id} className={`border rounded-[24px] overflow-hidden ${
              isLatestVotable ? 'border-blue-200 dark:border-blue-800 ring-2 ring-blue-50 dark:ring-blue-950/30' : 'opacity-80'
            } border-slate-200 dark:border-gray-800`}>
              <div className="flex justify-between items-center bg-white dark:bg-[#1A1A1A] hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                <button 
                  onClick={() => handleChapterClick(chapter.id)}
                  className="flex-1 text-left p-6 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-slate-900 dark:text-white">Глава {chapter.chapter_number}: {chapter.title}</span>
                    {isLatestVotable && !hasVoted && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full font-bold">
                        ГОЛОСОВАТЬ!
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 dark:text-gray-400 text-lg">{openChapter === chapter.id ? '−' : '+'}</span>
                </button>
                
                {/* Кнопка удаления для автора - ТОЛЬКО для последней главы и ТОЛЬКО до окончания голосования */}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteChapter(chapter.id, chapter.expires_at)}
                    disabled={deleting === chapter.id}
                    className="mr-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                    title="Удалить главу (доступно только для последней главы до окончания голосования)"
                  >
                    {deleting === chapter.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 dark:border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {openChapter === chapter.id && (
                <div className="p-6 border-t border-slate-100 dark:border-gray-800 bg-white dark:bg-[#1A1A1A]">
                  <div className="text-lg leading-relaxed mb-10 text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{chapter.content}</div>
                  
                  {/* Фон блока голосования */}
                  <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-slate-200 dark:border-gray-800 shadow-sm">
                    <h3 className="text-xl font-bold mb-4 text-center text-slate-900 dark:text-white">
                      {chapter.question_text}
                    </h3>
                    
                    {/* Таймер показывается ТОЛЬКО для последней главы И ТОЛЬКО если голосование не завершено */}
                    {isLatestVotable && <Countdown expiresAt={chapter.expires_at} />}

                    <div className="space-y-3">
                      {chapter.options?.map((opt: any) => {
                        const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                        // Голосовать можно ТОЛЬКО в последней главе И ТОЛЬКО если голосование не завершено
                        const canVote = isLatestVotable && !hasVoted && user;

                        return (
                          <div key={opt.id} className="space-y-2">
                            <button 
                              disabled={!canVote}
                              onClick={() => handleVote(chapter.id, opt.id, opt.votes)}
                              className="relative w-full text-left p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-800/50 overflow-hidden transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-gray-700/50"
                            >
                              {(hasVoted || isExpired || !isLatestVotable) && (
                                <div className="absolute top-0 left-0 h-full bg-blue-500/20 dark:bg-blue-500/40 transition-all" style={{ width: `${percentage}%` }} />
                              )}
                              <div className="relative flex justify-between z-10 text-slate-900 dark:text-white">
                                <span>{opt.text}</span>
                                {(hasVoted || isExpired || !isLatestVotable) && <span>{percentage}%</span>}
                              </div>
                            </button>

                            {/* КНОПКА ПОДДЕРЖАТЬ (появляется после голосования) - ТОЛЬКО для последней главы */}
                            {hasVoted && isLatestVotable && (
                              <button 
                                onClick={() => handlePaidVote(chapter.id, opt.id)}
                                className="w-full py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/30 transition"
                              >
                                Повлиять (1 ⚡ = 3 голоса)
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!user && isLatestVotable && (
                      <p className="text-center text-xs text-slate-500 dark:text-gray-400 mt-6 uppercase font-bold tracking-widest">
                        <Link href="/auth" className="text-blue-600 dark:text-blue-400 hover:underline">Войдите</Link>, чтобы участвовать
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}