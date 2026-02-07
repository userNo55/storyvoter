'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaShare, FaTelegramPlane, FaVk, FaCopy, FaCheck } from 'react-icons/fa';

// Жесткий ID автора для проверки
const AUTHOR_ID = '01db5da0-7374-40ac-b6a5-63be48bc7410';

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
        setTimeLeft(`${h}ч ${m}м ${s}с`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="text-red-600 dark:text-red-400 font-bold text-sm mb-4 text-center bg-red-50 dark:bg-red-950/30 py-3 px-4 rounded-xl border-2 border-red-200 dark:border-red-800 tracking-wider shadow-sm">
      ⏳ {timeLeft}
    </div>
  );
}

// --- КОМПОНЕНТ ДЛЯ ПОДЕЛИТЬСЯ ---
function ShareButton({ 
  storyTitle, 
  chapterNumber, 
  chapterId 
}: { 
  storyTitle: string, 
  chapterNumber: number, 
  chapterId: string 
}) {
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMessages = [
    `Тут в истории «${storyTitle}» идёт спорный выбор в главе ${chapterNumber}. Идём ломать сюжет в нужную сторону. Голосуй тут: ${window.location.origin}/story/${chapterId}`,
    `В главе ${chapterNumber} «${storyTitle}» дилемма. Нужен твой голос. Жми: ${window.location.origin}/story/${chapterId}`,
    `Народ, срочно! В «${storyTitle}» идёт битва за развитие сюжета. Наша версия проигрывает. Лети голосовать: ${window.location.origin}/story/${chapterId}`,
    `Отдал свой голос в истории «${storyTitle}». Теперь жду новую главу как соучастник. Интересно, к чему это приведёт? ${window.location.origin}/story/${chapterId}`
  ];

  const getRandomMessage = () => {
    const randomIndex = Math.floor(Math.random() * shareMessages.length);
    return shareMessages[randomIndex];
  };

  const copyToClipboard = async () => {
    const message = getRandomMessage();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const shareToTelegram = () => {
    const message = encodeURIComponent(getRandomMessage());
    window.open(`https://t.me/share/url?url=${window.location.origin}/story/${chapterId}&text=${message}`, '_blank');
  };

  const shareToVK = () => {
    const message = encodeURIComponent(getRandomMessage());
    window.open(`https://vk.com/share.php?url=${window.location.origin}/story/${chapterId}&title=${encodeURIComponent(storyTitle)}&comment=${message}`, '_blank');
  };

  const shareViaNative = async () => {
    const message = getRandomMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Глава ${chapterNumber}: ${storyTitle}`,
          text: message,
          url: `${window.location.origin}/story/${chapterId}`,
        });
      } catch (err) {
        console.error('Ошибка нативного шеринга:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="relative mt-4">
      <button
        onClick={() => setShowSharePanel(!showSharePanel)}
        className="w-full py-2 text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/30 transition flex items-center justify-center gap-2"
      >
        <FaShare className="w-4 h-4" />
        Позвать друзей / Поделиться
      </button>

      {showSharePanel && (
        <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-lg">
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-3 text-center">
            Случайный текст для расшаривания:
          </p>
          <div className="text-sm text-slate-700 dark:text-gray-300 mb-4 p-3 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-100 dark:border-gray-700">
            {getRandomMessage()}
          </div>
          
          <div className="flex justify-center gap-2">
            <button
              onClick={shareToTelegram}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              title="Поделиться в Telegram"
            >
              <FaTelegramPlane className="w-5 h-5" />
            </button>
            
            <button
              onClick={shareToVK}
              className="p-2 bg-[#4C75A3] text-white rounded-lg hover:bg-[#3a5a80] transition"
              title="Поделиться в VK"
            >
              <FaVk className="w-5 h-5" />
            </button>
            
            <button
              onClick={copyToClipboard}
              className="p-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-300 dark:hover:bg-gray-600 transition flex items-center gap-2"
              title="Скопировать ссылку"
            >
              {copied ? (
                <>
                  <FaCheck className="w-5 h-5 text-green-500" />
                  <span className="text-xs">Скопировано!</span>
                </>
              ) : (
                <FaCopy className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={shareViaNative}
              className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              title="Поделиться"
            >
              <FaShare className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
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
  const [completing, setCompleting] = useState(false);
  const [isAuthorIdMatch, setIsAuthorIdMatch] = useState(false);

  const findLatestChapterId = (chapters: any[]) => {
    if (chapters.length === 0) return null;
    const sortedChapters = [...chapters].sort((a, b) => b.chapter_number - a.chapter_number);
    return sortedChapters[0].id;
  };

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const [
          profilePromise,
          votesPromise,
          storyPromise,
          chaptersPromise
        ] = await Promise.all([
          user ? supabase.from('profiles').select('coins').eq('id', user.id).single() : Promise.resolve({ data: null }),
          user ? supabase.from('votes').select('chapter_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
          supabase.from('stories').select(`
            *,
            profiles(*)
          `).eq('id', id).single(),
          supabase.from('chapters').select('*, options(*)').eq('story_id', id).order('chapter_number', { ascending: true })
        ]);

        const profileData = profilePromise.data;
        const votesData = votesPromise.data;
        const storyData = storyPromise.data;
        const chaptersData = chaptersPromise.data;
        
        setUserCoins(profileData?.coins || 0);
        setVotedChapters(votesData?.map((item: any) => item.chapter_id) || []);
        setStory(storyData);
        setChapters(chaptersData || []);

        // ПРОВЕРКА: история создана нужным автором?
        if (storyData?.author_id === AUTHOR_ID) {
          setIsAuthorIdMatch(true);
        }

        const latestChapterId = findLatestChapterId(chaptersData || []);
        if (latestChapterId) {
          setOpenChapter(latestChapterId);
        }
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  // Проверка является ли пользователь автором этой истории
  const isAuthor = user && story && story.author_id === user.id;

  const handleChapterClick = (chapterId: string) => {
    setOpenChapter(openChapter === chapterId ? null : chapterId);
  };

  // Обычное бесплатное голосование (вес 1) - доступно всем
  const handleVote = async (chapterId: string, optionId: string, currentVotes: number) => {
    if (!user) return router.push('/auth');
    const { error } = await supabase.from('votes').insert({ user_id: user.id, chapter_id: chapterId });
    if (error) return alert("Вы уже голосовали!");

    await supabase.from('options').update({ votes: currentVotes + 1 }).eq('id', optionId);
    
    window.location.reload();
  };

  // Платное голосование (вес 3) - доступно только если история создана нужным автором
  const handlePaidVote = async (chapterId: string, optionId: string) => {
    if (!user) return router.push('/auth');
    if (userCoins < 1) return router.push('/buy');
    
    const { error } = await supabase.rpc('vote_with_coin', {
      user_id_param: user.id,
      option_id_param: optionId,
      chapter_id_param: chapterId
    });

    if (error) alert(error.message);
    else {
      window.location.reload();
    }
  };

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
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);
      
      if (error) {
        console.error("Ошибка при удалении главы:", error);
        throw error;
      }

      setChapters(prevChapters => prevChapters.filter(c => c.id !== chapterId));
      
      const updatedLatestChapterId = findLatestChapterId(chapters.filter(c => c.id !== chapterId));
      setOpenChapter(updatedLatestChapterId);

      alert("Глава успешно удалена");
      
    } catch (error) {
      console.error("Ошибка при удалении главы:", error);
      alert("Произошла ошибка при удалении главы");
    } finally {
      setDeleting(null);
    }
  };

  const handleCompleteStory = async () => {
    if (!isAuthor || !story) return;
    
    if (!confirm("Завершить историю? После этого нельзя будет добавлять новые главы.")) {
      return;
    }

    setCompleting(true);

    try {
      const { error } = await supabase
        .from('stories')
        .update({ is_completed: true })
        .eq('id', story.id);

      if (error) throw error;

      setStory({ 
        ...story, 
        is_completed: true 
      });
      alert("История завершена!");
    } catch (error) {
      console.error("Ошибка при завершении истории:", error);
      alert("Произошла ошибка");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 font-sans bg-white dark:bg-[#0A0A0A] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
        <header className="flex justify-between items-center mb-8 border-b pb-4 border-slate-100 dark:border-gray-800">
          <div className="h-6 w-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-40 bg-slate-200 dark:bg-gray-700 rounded-full"></div>
        </header>

        <div className="h-12 bg-slate-200 dark:bg-gray-700 rounded mb-10 w-3/4"></div>

        <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 dark:bg-[#1A1A1A] rounded-[24px] border border-slate-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-gray-700"></div>
          <div className="flex-1">
            <div className="h-3 w-32 bg-slate-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-5 w-48 bg-slate-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>

        <div className="space-y-2 mb-10">
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>

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

      {isAuthor && !story.is_completed && (
        <div className="mb-8 flex justify-center">
          <button
            onClick={handleCompleteStory}
            disabled={completing}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded-2xl font-bold transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Завершение...</span>
              </div>
            ) : (
              '✅ Завершить историю'
            )}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {chapters.map((chapter) => {
          const isExpired = new Date(chapter.expires_at).getTime() < new Date().getTime();
          const hasVoted = votedChapters.includes(chapter.id);
          const isLatest = chapter.chapter_number === latestChapterNumber;
          const isLatestVotable = isLatest && !isExpired && !story.is_completed;
          const totalVotes = chapter.options?.reduce((sum: number, o: any) => sum + o.votes, 0) || 0;
          
          const canDelete = isAuthor && isLatest && !isExpired && !story.is_completed;

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
                  
                  {!story.is_completed ? (
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-slate-200 dark:border-gray-800 shadow-sm">
                      <h3 className="text-xl font-bold mb-4 text-center text-slate-900 dark:text-white">
                        {chapter.question_text}
                      </h3>
                      
                      {isLatestVotable && <Countdown expiresAt={chapter.expires_at} />}
                  
                      {/* КОНТЕЙНЕР ДЛЯ ОПЦИЙ */}
                      <div className="space-y-4">
                        {chapter.options?.map((opt: any, index: number) => {
                          const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                          const canVote = isLatestVotable && !hasVoted && user;
                          const hasVotes = opt.votes > 0;

                          return (
                            <div key={opt.id} className="space-y-3">
                              {/* ОСНОВНАЯ КАРТОЧКА ОПЦИИ */}
                              <div className={`relative rounded-xl border transition-all ${
                                canVote 
                                  ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-gray-800 cursor-pointer' 
                                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-gray-800/50'
                              } ${!canVote ? 'opacity-80' : ''}`}>
                                {/* ВЕРХНЯЯ ЧАСТЬ - ТЕКСТ И ПРОЦЕНТЫ */}
                                <div className="p-4">
                                  <div className="flex justify-between items-center gap-4">
                                    {/* ТЕКСТ ОПЦИИ */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                          index === 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                          index === 1 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
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
                                    
                                    {/* ПРАВАЯ ЧАСТЬ: ПРОЦЕНТЫ И КНОПКА */}
                                    <div className="flex items-center gap-3">
                                      {/* ПРОЦЕНТЫ (если голосовали) */}
                                      {(hasVoted || isExpired) && totalVotes > 0 && (
                                        <div className="text-right min-w-[70px]">
                                          <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {percentage}%
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* КНОПКА ПОДДЕРЖАТЬ */}
                                      {hasVoted && isLatestVotable && isAuthorIdMatch && (
                                        <button 
                                          onClick={() => handlePaidVote(chapter.id, opt.id)}
                                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-between whitespace-nowrap w-full min-w-[140px]"
                                        >
                                          <span className="text-yellow-300">⚡</span>
                                          <span>Поддержать</span>
                                          <span className="w-4"></span> {/* Невидимый элемент для балансировки */}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* ПОЛОСКА ПРОГРЕССА (если голосовали) */}
                                  {(hasVoted || isExpired) && hasVotes && (
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
                                </div>
                                
                                {/* КНОПКА ГОЛОСОВАНИЯ (если можно голосовать) */}
                                {canVote && (
                                  <div className="border-t border-slate-100 dark:border-gray-700 p-4">
                                    <button 
                                      onClick={() => handleVote(chapter.id, opt.id, opt.votes)}
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

                      {/* КНОПКА "ПОДЕЛИТЬСЯ" - ПОЯВЛЯЕТСЯ ПОСЛЕ ГОЛОСОВАНИЯ */}
                      {hasVoted && isLatestVotable && (
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
                          <ShareButton 
                            storyTitle={story.title}
                            chapterNumber={chapter.chapter_number}
                            chapterId={id}
                          />
                        </div>
                      )}

                      {!user && isLatestVotable && (
                        <div className="mt-8 p-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                          <p className="text-center text-sm text-slate-600 dark:text-gray-400">
                            <Link href="/auth" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                              Войдите
                            </Link>, чтобы участвовать в голосовании
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-gray-900 p-8 rounded-[32px] border border-slate-200 dark:border-gray-800 shadow-sm text-center">
                      <div className="text-purple-600 dark:text-purple-400 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                        История завершена
                      </h3>
                      <p className="text-slate-500 dark:text-gray-400">
                        Автор завершил эту историю. Читайте целиком!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}