'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudonym, setPseudonym] = useState(''); // Новое поле для псевдонима
  const [status, setStatus] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Загрузка...');

    if (isLogin) {
      // ВХОД
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('Ошибка входа: ' + error.message);
      } else {
        window.location.href = '/';
      }
    } else {
      // РЕГИСТРАЦИЯ
      if (!pseudonym) return setStatus('Введите псевдоним!');

      // 1. Создаем пользователя
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
      });

      if (signUpError) {
        setStatus('Ошибка: ' + signUpError.message);
        return;
      }

      if (data.user) {
        // 2. Сразу записываем псевдоним в таблицу profiles
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
    <div className="max-w-md mx-auto mt-20 p-8 border border-slate-200 rounded-[32px] shadow-2xl bg-white font-sans text-slate-900">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
        <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${isLogin ? 'bg-white shadow' : 'text-slate-500'}`}>Вход</button>
        <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${!isLogin ? 'bg-white shadow' : 'text-slate-500'}`}>Регистрация</button>
      </div>

      <h1 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-center">{isLogin ? 'С возвращением!' : 'Новый пользователь'}</h1>

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <input 
            type="text" 
            placeholder="Ваш псевдоним" 
            className="w-full border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={e => setPseudonym(e.target.value)}
            required
          />
        )}
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          className="w-full border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition">
          {isLogin ? 'Войти' : 'Создать профиль'}
        </button>
      </form>

      {status && <p className="mt-4 text-center text-sm font-bold text-blue-600 bg-blue-50 p-3 rounded-xl">{status}</p>}
    </div>
  );
}
