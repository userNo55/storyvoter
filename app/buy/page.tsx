'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Добавляем useRouter для навигации

export default function BuyPage() {
  const router = useRouter(); // Инициализируем роутер
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Добавляем состояние загрузки

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
        setCoins(data?.coins || 0);
      } else {
        // Если пользователя нет, отправляем на авторизацию
        router.push('/auth');
      }
    }
    loadData();
  }, [router]);

  const handlePayment = async (qty: number) => {
    if (!user) return;

    setLoading(true);

    try {
      // 1. Вместо прямой записи в базу - вызываем наш API-роут для ЮKassa
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: qty * 150, // Передаем сумму в рублях
          userId: user.id    // Передаем ID пользователя
        }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        // 2. Перенаправляем пользователя на защищенную страницу оплаты ЮKassa
        window.location.href = data.confirmationUrl;
      } else if (data.error) {
        alert(data.error);
        setLoading(false);
      }
    } catch (error) {
      alert("Произошла ошибка при инициации оплаты.");
      setLoading(false);
    }
  };

  if (!user) return null; // Пока пользователь не загружен, ничего не показываем

  return (
    <div className="max-w-md mx-auto mt-20 p-10 border rounded-[40px] shadow-2xl text-center font-sans">
      <h1 className="text-3xl font-black mb-4 text-slate-900">Пополнить баланс</h1>
      <p className="text-slate-500 mb-8 text-sm leading-relaxed">
        Один платный голос (<span className="text-blue-600 font-bold">1 ⚡</span>) дает вашей опции сразу 
        <span className="font-bold text-slate-900 ml-1 underline">3 очка</span>. 
        Это лучший способ поддержать автора и повлиять на сюжет!
      </p>

      <div className="grid gap-4">
        {[1, 3, 7].map(n => (
          <button 
            key={n}
            onClick={() => handlePayment(n)}
            disabled={loading} // Отключаем кнопки во время запроса
            className="group p-6 border-2 border-slate-100 rounded-3xl flex justify-between items-center hover:border-blue-500 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-left">
              <span className="block font-black text-2xl text-slate-900">{n} ⚡</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{n * 3} обычных голоса</span>
            </div>
            <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl font-black group-hover:bg-blue-700 transition">
              {n * 150} ₽
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-[10px] text-slate-300 mt-10 uppercase tracking-widest font-bold">Безопасная оплата ЮKassa</p>
    </div>
  );
}
