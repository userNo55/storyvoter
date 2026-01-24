'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuyPage() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<any>(null);
  
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

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 pt-2 pb-10 font-sans bg-white dark:bg-[#0A0A0A] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* КНОПКА НАЗАД */}
      <header className="flex justify-between items-center mb-10 py-6 border-b border-slate-100 dark:border-gray-800">
        <Link 
          href="/" 
          className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-2"
        >
          <span>←</span> На главную
        </Link>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 dark:text-gray-500 block uppercase font-black">Баланс</span>
          <span className="font-bold text-sm text-slate-900 dark:text-white">{coins} ⚡</span>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="border border-slate-200 dark:border-gray-800 rounded-[32px] p-8 md:p-10 shadow-sm dark:shadow-lg dark:shadow-gray-900 text-center bg-white dark:bg-[#1A1A1A]">
        
        {/* ЗАГОЛОВОК */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-4 text-slate-900 dark:text-white leading-tight">
            Поддержать проект
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">
            На данном этапе мы собираем средства для запуска полноценной версии
          </p>
        </div>

        {/* ИКОНКА СБОРА СРЕДСТВ */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30 dark:shadow-blue-900/50">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>

        {/* ИНФОРМАЦИОННЫЙ БЛОК */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-8 border border-blue-100 dark:border-blue-800/30">
          <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">
            Для полноценного запуска проекта сейчас собираем средства в ВК
          </h2>
          <p className="text-slate-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
            Все средства пойдут на развитие платформы, серверную инфраструктуру 
            и реализацию новых функций для авторов и читателей.
          </p>
          
          {/* ССЫЛКА НА ВК */}
          <a 
            href="https://vk.com/vilkaTwist" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#0077FF] hover:bg-[#0066DD] text-white font-bold py-3 px-6 rounded-2xl transition-colors shadow-lg shadow-blue-500/30 dark:shadow-blue-900/50 w-full"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2m.84 14.48c-.53.15-1.5.47-2.38.54-1.25.1-1.5-.23-1.5-.93 0-.72.85-.89 2.3-1.25 1.38-.34 2.87-.77 2.83-2.33-.03-1.57-1.47-2.14-2.77-2.23-.88-.06-1.62.14-2.1.3l-.36.1-.4-.26c-.26-.16-.62-.35-.97-.35-.56 0-1.35.32-1.35 1.03 0 .47.3.74.77 1.05.33.21.68.42.88.67.25.32.32.46.47.78.1.21.05.48-.03.67-.2.45-.57.6-1.04.6-.66 0-1.32-.3-1.86-.67-1.07-.73-1.77-2.04-1.77-3.58 0-2.8 2.3-4.1 4.53-4.1 1.16 0 2.1.27 2.7.5.8.3 1.5.8 1.5 1.63 0 .5-.25.9-.7 1.2-.34.23-.76.37-1.23.37-.38 0-.75-.1-1.07-.27-.2-.1-.37-.23-.53-.4-.2-.2-.3-.33-.43-.53-.1-.17-.17-.4-.17-.63 0-.5.4-.9.9-.9.23 0 .45.08.63.23.14.1.25.23.35.4.1.17.2.3.3.43.2.27.43.5.7.67.4.27.87.43 1.37.43.9 0 1.6-.7 1.6-1.57 0-.8-.6-1.47-1.4-1.77-.4-.16-.9-.27-1.43-.27-1.23 0-2.33.6-3.03 1.53-.7.93-1.1 2.2-1.1 3.57 0 1.37.4 2.63 1.1 3.57.7.93 1.8 1.53 3.03 1.53.7 0 1.33-.2 1.9-.5.57-.3 1.03-.77 1.37-1.33.33-.57.5-1.23.5-1.93 0-.6-.17-1.1-.47-1.5-.3-.4-.7-.6-1.2-.6-.43 0-.77.17-1.03.5-.27.33-.4.77-.4 1.3 0 .53.13.97.4 1.3.27.33.6.5 1.03.5.1 0 .2 0 .3-.03z"/>
            </svg>
            <span>Перейти в группу ВКонтакте</span>
          </a>
          
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-4">
            Следите за обновлениями и поддержите проект
          </p>
        </div>

        {/* СТАТУС ПРОЕКТА */}
        <div className="text-left space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Что уже работает:</h3>
            <ul className="text-sm text-slate-600 dark:text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Чтение и создание историй</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Интерактивное голосование</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Личный кабинет автора</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Что планируется:</h3>
            <ul className="text-sm text-slate-600 dark:text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Хостинг платформы</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Дополнительный функционал голосования</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Монетизация для авторов</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ФУТЕР */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800">
          <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-bold">
            Спасибо за вашу поддержку!
          </p>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
            По всем вопросам пишите в сообщения группы ВК
          </p>
        </div>
      </div>
    </div>
  );
}