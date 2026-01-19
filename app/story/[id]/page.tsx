'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabase';
import Link from 'next/link';

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [story, setStory] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStory() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data } = await supabase
        .from('stories')
        .select(`*, favorites(user_id)`)
        .eq('id', id)
        .filter('favorites.user_id', 'eq', user?.id || '00000000-0000-0000-0000-000000000000')
        .single();

      setStory(data);
      setIsFavorite(data?.favorites?.length > 0);
    }
    fetchStory();
  }, [id]);

  const handleFavorite = async () => {
    if (!userId) return;
    if (isFavorite) {
      await supabase.from('favorites').delete().match({ user_id: userId, story_id: id });
    } else {
      await supabase.from('favorites').insert({ user_id: userId, story_id: id });
    }
    setIsFavorite(!isFavorite);
  };

  if (!story) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="text-slate-400 hover:text-black">← Назад</Link>
        <button 
          onClick={handleFavorite}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-500'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {isFavorite ? 'В избранном' : 'В избранное'}
        </button>
      </div>
      <h1 className="text-4xl font-bold mb-4">{story.title}</h1>
      <p className="text-slate-600 mb-10 text-lg leading-relaxed">{story.description}</p>
      {/* Далее вывод глав... */}
    </div>
  );
}
