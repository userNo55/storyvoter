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
    <div className="max-w-2xl mx-auto p-6 font-sans">
      {/* НОВАЯ КНОПКА НАЗАД */}
      <header className="flex justify-between items-center mb-8 py-6 border-b border-slate-100">
        <Link href="/dashboard" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-2">
          <span>←</span> Назад в кабинет
        </Link>
      </header>
      <h1 className="text-2xl font-black mb-8 text-blue-600">Добавить главу {nextNum}</h1>
      
      <input type="text" placeholder="Название главы" className="w-full p-4 border rounded-xl mb-4" onChange={e => setTitle(e.target.value)} />
      <textarea placeholder="Текст истории..." className="w-full p-4 border rounded-xl h-64 mb-4" onChange={e => setContent(e.target.value)} />
      
      <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
        <input type="text" placeholder="Вопрос читателям" className="w-full bg-white/10 p-3 rounded-xl" onChange={e => setQuestion(e.target.value)} />
        {options.map((opt, i) => (
          <input key={i} placeholder={`Вариант ${i+1}`} className="w-full bg-white/10 p-3 rounded-xl" value={opt} onChange={e => {
            const n = [...options]; n[i] = e.target.value; setOptions(n);
          }} />
        ))}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Голосование в часах:</label>
          <input type="number" value={hours} className="bg-white/10 p-2 rounded-lg w-20" onChange={e => setHours(Number(e.target.value))} />
        </div>
      </div>

      <button onClick={handleAdd} disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold mt-8">
        {loading ? 'Публикация...' : 'Опубликовать продолжение'}
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <AddChapterForm />
    </Suspense>
  );
}
