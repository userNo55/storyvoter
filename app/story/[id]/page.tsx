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
    <div className="text-orange-500 font-mono text-xs mb-4 text-center bg-orange-50 py-2 rounded-xl border border-orange-100">
      {timeLeft}
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

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
        setUserCoins(profile?.coins || 0);
        const { data: v } = await supabase.from('votes').select('chapter_id').eq('user_id', user.id);
        setVotedChapters(v?.map(item => item.chapter_id) || []);
      }

      const { data: s } = await supabase.from('stories').select('*, profiles(*)').eq('id', id).single();
      setStory(s);

      const { data: c } = await supabase.from('chapters').select('*, options(*)').eq('story_id', id).order('chapter_number', { ascending: true });
      setChapters(c || []);
      setLoading(false);
    }
    loadData();
  }, [id]);

  // Обычное бесплатное голосование (вес 1)
  const handleVote = async (chapterId: string, optionId: string, currentVotes: number) => {
    if (!user) return router.push('/auth');
    const { error } = await supabase.from('votes').insert({ user_id: user.id, chapter_id: chapterId });
    if (error) return alert("Вы уже голосовали!");

    await supabase.from('options').update({ votes: currentVotes + 1 }).eq('id', optionId);
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
    else window.location.reload();
  };

  if (loading) return <div className="p-10 text-center font-sans">Загрузка...</div>;

  const latestChapterNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) : 0;

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans bg-white min-h-screen text-slate-900">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <Link href="/" className="text-blue-600 font-bold">← К списку</Link>
        {user && (
          <Link href="/buy" className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full font-bold text-sm border border-blue-100">
            Баланс: {userCoins} ⚡ <span className="ml-1 text-blue-400">+</span>
          </Link>
        )}
      </header>

      <h1 className="text-4xl font-black mb-10">{story.title}</h1>

      <div className="space-y-6">
        {chapters.map((chapter) => {
          const isExpired = new Date(chapter.expires_at).getTime() < new Date().getTime();
          const hasVoted = votedChapters.includes(chapter.id);
          const isLatest = chapter.chapter_number === latestChapterNumber;
          const totalVotes = chapter.options?.reduce((sum: number, o: any) => sum + o.votes, 0) || 0;

          return (
            <div key={chapter.id} className={`border rounded-[24px] overflow-hidden ${isLatest ? 'border-blue-200 ring-2 ring-blue-50' : 'opacity-80'}`}>
              <button 
                onClick={() => setOpenChapter(openChapter === chapter.id ? null : chapter.id)}
                className="w-full text-left p-6 flex justify-between items-center bg-white"
              >
                <span className="font-bold text-xl">Глава {chapter.chapter_number}: {chapter.title}</span>
                <span>{openChapter === chapter.id ? '−' : '+'}</span>
              </button>

              {openChapter === chapter.id && (
                <div className="p-6 border-t bg-white">
                  <div className="text-lg leading-relaxed mb-10 text-slate-700 whitespace-pre-wrap">{chapter.content}</div>
                  
                  <div className="bg-slate-900 p-8 rounded-[32px] text-white">
                    <h3 className="text-xl font-bold mb-4 text-center">{chapter.question_text}</h3>
                    
                    {isLatest && !isExpired && <Countdown expiresAt={chapter.expires_at} />}

                    <div className="space-y-3">
                      {chapter.options?.map((opt: any) => {
                        const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                        const canVote = isLatest && !isExpired && !hasVoted && user;

                        return (
                          <div key={opt.id} className="space-y-2">
                            <button 
                              disabled={!canVote}
                              onClick={() => handleVote(chapter.id, opt.id, opt.votes)}
                              className="relative w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all"
                            >
                              {(hasVoted || isExpired || !isLatest) && (
                                <div className="absolute top-0 left-0 h-full bg-blue-500/30 transition-all" style={{ width: `${percentage}%` }} />
                              )}
                              <div className="relative flex justify-between z-10">
                                <span>{opt.text}</span>
                                {(hasVoted || isExpired || !isLatest) && <span>{percentage}%</span>}
                              </div>
                            </button>

                            {/* КНОПКА ПОДДЕРЖАТЬ (появляется после голосования) */}
                            {hasVoted && isLatest && !isExpired && (
                              <button 
                                onClick={() => handlePaidVote(chapter.id, opt.id)}
                                className="w-full py-2 text-xs font-bold text-blue-400 bg-blue-400/10 rounded-lg hover:bg-blue-400/20 transition"
                              >
                                Повлиять (1 ⚡ = 3 голоса)
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!user && isLatest && (
                      <p className="text-center text-xs text-slate-500 mt-6 uppercase font-bold tracking-widest">
                        <Link href="/auth" className="text-blue-400 hover:underline">Войдите</Link>, чтобы участвовать
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
