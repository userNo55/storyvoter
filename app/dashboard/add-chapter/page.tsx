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

    // 1. Создаем главу
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

    // 2. Создаем варианты
    const opts = options.map(o => ({ chapter_id: chap.id, text: o, votes: 0 }));
    await supabase.from('options').insert(opts);

    alert("Глава опубликована!");
    router.push('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans text-slate-900 dark:text-white bg-white dark:bg-[#0A0A0A] min-h-screen">
      {/* ХЕДЕР */}
      <header className="flex justify-between items-center mb-8 py-6 border-b border-slate-100 dark:border-gray-800">
        <Link 
          href="/dashboard" 
          className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-2"
        >
          <span>←</span> Назад в кабинет
        </Link>
      </header>
      
      <h1 className="text-2xl font-black mb-8 text-blue-600 dark:text-blue-400">Добавить главу {nextNum}</h1>
      
      {/* Поля ввода с темной темой */}
      <div className="space-y-6">
        <input 
          type="text" 
          placeholder="Название главы" 
          className="w-full p-4 border-2 border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 rounded-2xl focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none transition text-slate-900 dark:text-white"
          onChange={e => setTitle(e.target.value)} 
        />
        
        <textarea 
          placeholder="Текст истории..." 
          className="w-full p-4 border-2 border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 rounded-2xl h-64 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 outline-none transition text-slate-900 dark:text-white"
          onChange={e => setContent(e.target.value)} 
        />
        
        {/* Блок голосования с темной темой */}
        <div className="bg-slate-900 dark:bg-gray-900 p-8 rounded-[32px] text-white dark:text-white space-y-4">
          <h3 className="text-lg font-bold mb-4">Вопрос для читателей:</h3>
          
          <input 
            type="text" 
            placeholder="Введите вопрос читателям" 
            className="w-full bg-white/10 dark:bg-gray-800/50 p-4 rounded-2xl border border-white/10 dark:border-gray-700 focus:bg-white/15 dark:focus:bg-gray-700/50 focus:border-blue-500 outline-none transition"
            onChange={e => setQuestion(e.target.value)} 
          />
          
          <div className="space-y-3">
            {options.map((opt, i) => (
              <input 
                key={i} 
                placeholder={`Вариант ответа ${i+1}`} 
                className="w-full bg-white/10 dark:bg-gray-800/50 p-4 rounded-2xl border border-white/10 dark:border-gray-700 focus:bg-white/15 dark:focus:bg-gray-700/50 focus:border-blue-500 outline-none transition"
                value={opt} 
                onChange={e => {
                  const n = [...options]; 
                  n[i] = e.target.value; 
                  setOptions(n);
                }} 
              />
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/10 dark:border-gray-700">
            <label className="text-sm text-slate-300 dark:text-gray-400 block mb-2 font-medium">
              Длительность голосования (в часах):
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={hours} 
                className="bg-white/10 dark:bg-gray-800/50 p-3 rounded-xl border border-white/10 dark:border-gray-700 w-24 text-center focus:border-blue-500 outline-none"
                onChange={e => setHours(Number(e.target.value))} 
                min="1"
                max="168"
              />
              <span className="text-slate-300 dark:text-gray-400 text-sm">
                {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleAdd} 
        disabled={loading} 
        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold mt-8 hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-lg shadow-blue-100 dark:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Публикация...' : 'Опубликовать продолжение'}
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-white">
        Загрузка...
      </div>
    }>
      <AddChapterForm />
    </Suspense>
  );
}