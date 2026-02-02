// app/api/yookassa-webhook/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🔄 [Вебхук] Начало обработки');
  
  try {
    const rawBody = await request.text();
    console.log('📨 [Вебхук] Сырое тело:', rawBody);
    const event = JSON.parse(rawBody);

    if (event.event === 'payment.succeeded') {
      console.log('✅ [Вебхук] Событие: payment.succeeded');
      
      const payment = event.object;
      const userId = payment.metadata?.userId;
      const coinsToAdd = payment.metadata?.coins;

      console.log(`📊 Данные: userId=${userId}, coins=${coinsToAdd}`);

      if (!userId || !coinsToAdd) {
        console.error('❌ [Вебхук] Нет userId или coins в metadata');
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
      }

      // ВАРИАНТ: Делаем два отдельных запроса напрямую
      console.log('🔄 [Вебхук] Выполняю обновление базы...');
      
      // 1. Сначала получаем текущий баланс
      const { data: currentProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ [Вебхук] Ошибка получения профиля:', fetchError);
        throw fetchError;
      }

      const currentCoins = currentProfile?.coins || 0;
      const newCoins = currentCoins + coinsToAdd;
      
      console.log(`📊 Текущий баланс: ${currentCoins}, будет: ${newCoins}`);

      // 2. Обновляем баланс
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ [Вебхук] Ошибка обновления баланса:', updateError);
        throw updateError;
      }

      // 3. Создаем запись в transactions
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          amount: coinsToAdd
        });

      if (txError) {
        console.error('❌ [Вебхук] Ошибка создания транзакции:', txError);
        throw txError;
      }

      console.log(`💰 [Вебхук] Успех! Баланс пользователя ${userId} обновлен: ${currentCoins} → ${newCoins}`);
      console.log(`📝 [Вебхук] Транзакция на ${coinsToAdd} монет записана`);
      
    } else {
      console.log(`📭 [Вебхук] Игнорирую: ${event.event}`);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('🔥 [Вебхук] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}