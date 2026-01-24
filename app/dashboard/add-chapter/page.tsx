'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import Link from 'next/link';

function AddChapterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyId = searchParams.get('storyId');
  const nextNum = searchParams.get('next');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!title || !content || !question || options.some(o => !o)) return alert("Заполните всё!");
    setLoading(true);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + Number(hours));

    const { data: chap, error: cErr } = await supabase.from('chapters').insert({
      story_id: storyId,
      chapter_number: Number(nextNum),
      title,
      content,
      question_text: question,
      expires_at: expiresAt.toISOString()
    }).select().single();

    if (cErr) {
      alert("Ошибка: " + cErr.message);
      setLoading(false);
      return;
    }

    const opts = options.map(o => ({ chapter_id: chap.id, text: o, votes: 0 }));
    await supabase.from('options').insert(opts);

    alert("Глава опубликована!");
    router.push('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans text-slate-900 dark:text-white bg-white dark:bg-[#0A0A0A] min-h-screen">
      
      {/* ХЕДЕР С КНОПКОЙ НАЗАД */}
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
        
        <h1 className="text-2xl font-black mb-8 text-blue-600 dark:text-blue-400">
          Добавить главу {nextNum}
        </h1>
      </header>

      {/* ПОЛЯ ДЛЯ ГЛАВЫ */}
      <div className="space-y-4 mb-8">
        <input 
          type="text" 
          placeholder="Название главы" 
          className="w-full p-4 border border-slate-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={e => setTitle(e.target.value)} 
        />
        <textarea 
          placeholder="Текст истории..." 
          className="w-full p-4 border border-slate-200 dark:border-gray-800 rounded-xl h-64 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          onChange={e => setContent(e.target.value)} 
        />
      </div>
      
      {/* ИСПРАВЛЕННЫЙ БЛОК ВОПРОСА */}
      <div className="bg-blue-50 dark:bg-gray-900 p-6 rounded-3xl border border-blue-100 dark:border-gray-700 space-y-4 mb-8">
        <input 
          type="text" 
          placeholder="Вопрос читателям" 
          className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl border border-blue-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500"
          onChange={e => setQuestion(e.target.value)} 
        />
        
        {options.map((opt, i) => (
          <input 
            key={i} 
            placeholder={`Вариант ${i+1}`} 
            className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl border border-blue-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500"
            value={opt} 
            onChange={e => {
              const n = [...options]; 
              n[i] = e.target.value; 
              setOptions(n);
            }} 
          />
        ))}
        
        <div>
          <label className="text-xs text-blue-600 dark:text-gray-400 block mb-1 font-bold uppercase">
            Голосование в часах:
          </label>
          <input 
            type="number" 
            value={hours} 
            className="bg-white dark:bg-gray-800 p-2 rounded-lg w-20 border border-blue-200 dark:border-gray-700 text-slate-900 dark:text-white text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500"
            onChange={e => setHours(Number(e.target.value))} 
          />
        </div>
      </div>

      <button 
        onClick={handleAdd} 
        disabled={loading} 
        className="w-full bg-blue-600 dark:bg-blue-700 text-white p-5 rounded-2xl font-bold hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-lg shadow-blue-200 dark:shadow-blue-900/30 disabled:bg-slate-300 dark:disabled:bg-gray-800 disabled:shadow-none"
      >
        {loading ? 'Публикация...' : 'Опубликовать продолжение'}
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-sans text-slate-900 dark:text-white">Загрузка...</div>}>
      <AddChapterForm />
    </Suspense>
  );
}