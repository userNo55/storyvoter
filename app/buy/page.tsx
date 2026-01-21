'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuyPage() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Состояние для принятия условий оферты
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
        setCoins(data?.coins || 0);
      } else {
        router.push('/auth');
      }
    }
    loadData();
  }, [router]);

  const handlePayment = async (qty: number) => {
    if (!user) return;
    
    // Проверка чекбокса перед оплатой
    if (!acceptedTerms) {
      alert("Пожалуйста, примите условия пользовательского соглашения.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: qty * 150, 
          userId: user.id    
        }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
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

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 font-sans">
      
      {/* КНОПКА НАЗАД */}
      <header className="flex justify-between items-center mb-10 py-6 border-b border-slate-80">
        <Link 
          href="/" 
          className="text-sm font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-2"
        >
          <span>←</span> На главную
        </Link>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-black">Баланс</span>
          <span className="font-bold text-sm text-slate-900">{coins} ⚡</span>
        </div>
      </header>

      <div className="border rounded-[40px] p-8 md:p-10 shadow-2xl text-center bg-white">
        <h1 className="text-3xl font-black mb-4 text-slate-900 leading-tight">Пополнить баланс</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Один платный голос (<span className="text-blue-600 font-bold">1 ⚡</span>) дает вашей опции сразу 
          <span className="font-bold text-slate-900 ml-1 underline italic">3 очка</span>.
        </p>

        <div className="grid gap-4 mb-8">
          {[1, 3, 7].map(n => (
            <button 
              key={n}
              onClick={() => handlePayment(n)}
              disabled={loading}
              className="group p-5 border-2 border-slate-100 rounded-3xl flex justify-between items-center hover:border-blue-500 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <span className="block font-black text-2xl text-slate-900">{n} ⚡</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{n * 3} очка в сюжет</span>
              </div>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl font-black group-hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                {n * 150} ₽
              </div>
            </button>
          ))}
        </div>

        {/* ПОДТВЕРЖДЕНИЕ УСЛОВИЙ (ОФЕРТА) */}
        <div className="flex items-start gap-3 text-left mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <input 
            type="checkbox" 
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="terms" className="text-[11px] leading-snug text-slate-500 cursor-pointer">
            Я принимаю условия <Link href="/purchase-terms" className="text-blue-600 font-bold underline">Пользовательского соглашения</Link> и согласен на оказание платных услуг.
          </label>
        </div>
        
        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Безопасная оплата ЮKassa</p>
      </div>
    </div>
  );
}
