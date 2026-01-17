import { createClient } from '@supabase/supabase-js';

// Вписываем ключи напрямую, чтобы не зависеть от капризов системы .env
const supabaseUrl = 'https://egytiuxtjwlkbyoocbpx.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAPoFHbyhMPzyWfaOjX59w_pEblELIT';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('ВАШ_АДРЕС')) {
  console.error("ОШИБКА: Вы не заменили заглушки в файле app/supabase.ts на реальные ключи!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);