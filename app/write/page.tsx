'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WritePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [hasAcceptedAlready, setHasAcceptedAlready] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ageRating, setAgeRating] = useState('16+');

  const [chapterTitle, setChapterTitle] = useState('Глава 1');
  const [content, setContent] = useState('');
  const [question, setQuestion] = useState('');
  const [timerHours, setTimerHours] = useState(24);
  const [options, setOptions] = useState(['', '', '']);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Только зарегистрированные авторы могут писать истории");
        return router.push('/auth');
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('accepted_terms')
        .eq('id', user.id)
        .single();

      if (profile?.accepted_terms) {
        setHasAcceptedAlready(true);
      }
    }
    checkUser();
  }, [router]);

  const handlePublish = async () => {
    if (!title || !content || !question || options.some(o => !o)) {
      return alert("Заполните все поля и все 3 варианта ответа!");
    }

    if (!hasAcceptedAlready && !checkboxChecked) {
      return alert("Пожалуйста, примите условия размещения контента.");
    }

    setLoading(true);

    try {
      if (!hasAcceptedAlready) {
        await supabase
          .from('profiles')
          .update({ accepted_terms: true })
          .eq('id', user.id);
      }

      const { data: story, error: sErr } = await supabase
        .from('stories')
        .insert({
          title,
          description,
          age_rating: ageRating,
          author_id: user.id
        })
        .select()
        .single();

      if (sErr) throw sErr;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + Number(timerHours));

      const { data: chapter, error: cErr } = await supabase
        .from('chapters')
        .insert({
          story_id: story.id,
          chapter_number: 1,
          title: chapterTitle,
          content: content,
          question_text: question,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (cErr) throw cErr;

      const optionsData = options.map(text => ({
        chapter_id: chapter.id,
        text: text,
        votes: 0
      }));

      const { error: oErr } = await supabase.from('options').insert(optionsData);
      if (oErr) throw oErr;

      alert("Книга успешно опубликована!");
      router.push('/');
    } catch (err: any) {
      alert("Ошибка при публикации: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans text-slate-900 dark:text-white bg-white dark:bg-[#0A0A0A] min-h-screen">
      
      {/* КНОПКА НАЗАД */}
      <header className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors mb-6"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Назад в кабинет</span>
        </Link>
        
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Новая история
        </h1>
      </header>

      <section className="space-y-6 mb-12">
        <h2 className="text-xl font-bold border-b pb-2 text-slate-400 dark:text-gray-500">О книге</h2>
        <input 
          type="text" 
          placeholder="Название книги" 
          className="w-full text-3xl font-bold border-none outline-none placeholder:text-slate-200 dark:placeholder:text-gray-600 bg-transparent text-slate-900 dark:text-white"
          onChange={e => setTitle(e.target.value)}
        />
        <textarea 
          placeholder="Краткое описание (аннотация)..." 
          className="w-full border border-slate-200 dark:border-gray-800 p-4 rounded-2xl h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-900 text-slate-900 dark:text-white"
          onChange={e => setDescription(e.target.value)}
        />
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-500 dark:text-gray-500 uppercase">Рейтинг:</span>
          <select 
            className="p-2 border border-slate-200 dark:border-gray-800 rounded-xl font-bold bg-white dark:bg-gray-900 text-slate-900 dark:text-white"
            value={ageRating}
            onChange={e => setAgeRating(e.target.value)}
          >
            <option value="6+">6+</option>
            <option value="12+">12+</option>
            <option value="16+">16+</option>
            <option value="18+">18+</option>
          </select>
        </div>
      </section>

      <section className="space-y-6 mb-8 bg-slate-50 dark:bg-[#1A1A1A] p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-gray-800">
        <h2 className="text-xl font-bold border-b pb-2 text-slate-400 dark:text-gray-500">Первая глава</h2>
        <input 
          type="text" 
          value={chapterTitle}
          className="w-full bg-transparent border-b p-2 font-bold outline-none border-slate-200 dark:border-gray-700 focus:border-blue-500 text-slate-900 dark:text-white"
          onChange={e => setChapterTitle(e.target.value)}
        />
        <textarea 
          placeholder="Текст вашей главы..." 
          className="w-full border border-slate-200 dark:border-gray-800 p-4 rounded-2xl h-64 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-900 text-slate-900 dark:text-white"
          onChange={e => setContent(e.target.value)}
        />
        
        <div className="bg-slate-900 dark:bg-gray-900 p-6 rounded-2xl text-white dark:text-white border border-slate-800 dark:border-gray-700">
          <label className="block text-xs uppercase font-bold text-slate-400 dark:text-gray-400 mb-2">Вопрос читателям</label>
          <input 
            type="text" 
            placeholder="Например: Как поступит герой?" 
            className="w-full bg-white/10 dark:bg-gray-800/50 p-3 rounded-xl mb-6 outline-none border border-white/10 dark:border-gray-700 focus:border-blue-500 text-white dark:text-white"
            onChange={e => setQuestion(e.target.value)}
          />
          
          <label className="block text-xs uppercase font-bold text-slate-400 dark:text-gray-400 mb-2">Варианты ответов</label>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <input 
                key={i} 
                type="text" 
                placeholder={`Вариант ${i+1}`}
                className="w-full bg-white/10 dark:bg-gray-800/50 p-3 rounded-xl outline-none border border-white/10 dark:border-gray-700 focus:border-blue-500 transition-colors text-white dark:text-white"
                value={opt}
                onChange={e => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }}
              />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 dark:border-gray-700">
            <label className="block text-xs uppercase font-bold text-slate-400 dark:text-gray-400 mb-2 text-center md:text-left">Длительность голосования (часы)</label>
            <input 
              type="number" 
              value={timerHours}
              className="bg-white/10 dark:bg-gray-800/50 p-2 rounded-lg w-full md:w-24 outline-none text-center font-bold text-white dark:text-white"
              onChange={e => setTimerHours(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* Блок подтверждения оферты для новых авторов */}
      {!hasAcceptedAlready && (
        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
          <label className="flex items-start gap-4 cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-1 w-6 h-6 rounded border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900"
              checked={checkboxChecked}
              onChange={e => setCheckboxChecked(e.target.checked)}
            />
            <span className="text-sm leading-relaxed text-slate-700 dark:text-gray-300">
              Я принимаю <Link href="/author-terms" className="text-blue-600 dark:text-blue-400 font-bold underline">Условия размещения контента</Link>
            </span>
          </label>
        </div>
      )}

      <button 
        onClick={handlePublish}
        disabled={loading}
        className="w-full bg-blue-600 dark:bg-blue-700 text-white p-6 rounded-3xl font-black text-xl hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-xl shadow-blue-200 dark:shadow-blue-900/30 disabled:bg-slate-300 dark:disabled:bg-gray-800 disabled:shadow-none"
      >
        {loading ? 'ПУБЛИКАЦИЯ...' : 'ОПУБЛИКОВАТЬ КНИГУ'}
      </button>
    </div>
  );
}