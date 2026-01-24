'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Загрузка...');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('Ошибка входа: ' + error.message);
      } else {
        window.location.href = '/';
      }
    } else {
      if (!pseudonym) return setStatus('Введите псевдоним!');

      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
      });

      if (signUpError) {
        setStatus('Ошибка: ' + signUpError.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: data.user.id, pseudonym: pseudonym });

        if (profileError) {
          setStatus('Аккаунт создан, но профиль не настроен: ' + profileError.message);
        } else {
          setStatus('Успешная регистрация! Теперь войдите.');
          setIsLogin(true);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex items-center justify-center p-4 font-sans text-slate-900 dark:text-white transition-colors duration-300">
      <div className="max-w-md w-full p-8 border border-slate-200 dark:border-gray-800 rounded-[32px] shadow-2xl dark:shadow-gray-900/50 bg-white dark:bg-[#1A1A1A]">
        {/* Переключатель Вход/Регистрация */}
        <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-2xl mb-8">
          <button 
            type="button" 
            onClick={() => setIsLogin(true)} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              isLogin 
                ? 'bg-white dark:bg-gray-900 shadow' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            Вход
          </button>
          <button 
            type="button" 
            onClick={() => setIsLogin(false)} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-gray-900 shadow' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Заголовок */}
        <h1 className="text-xl font-black text-center mb-6 text-slate-900 dark:text-white">
          {isLogin ? 'С возвращением!' : 'Новый пользователь'}
        </h1>

        {/* Форма */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Ваш псевдоним" 
              className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors"
              onChange={e => setPseudonym(e.target.value)}
              required
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors"
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors"
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button 
            type="submit" 
            className="w-full bg-blue-600 dark:bg-blue-700 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 dark:hover:bg-blue-800 shadow-lg dark:shadow-blue-900/30 transition-all duration-300"
          >
            {isLogin ? 'Войти' : 'Создать профиль'}
          </button>
        </form>

        {/* Статус сообщение */}
        {status && (
          <p className="mt-6 text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
            {status}
          </p>
        )}

        {/* Ссылка на главную */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800 text-center">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
            <span>На главную</span>
          </a>
        </div>
      </div>
    </div>
  );
}