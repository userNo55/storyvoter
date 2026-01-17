import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем SERVICE_ROLE_KEY, так как это действие от имени системы
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const event = await req.json();

  // Проверяем, что платеж успешно завершен
  if (event.event === 'payment.succeeded') {
    const payment = event.object;
    const userId = payment.metadata.userId;
    const amountInRub = parseFloat(payment.amount.value);
    
    // Рассчитываем количество молний (например, 150 руб = 1 молния)
    const coinsToAdd = Math.floor(amountInRub / 150);

    if (coinsToAdd > 0) {
      // Обновляем баланс в Supabase
      const { error } = await supabaseAdmin.rpc('increment_coins', {
        user_id_param: userId,
        amount_param: coinsToAdd
      });

      if (error) console.error('Ошибка начисления:', error);
    }
  }

  return NextResponse.json({ status: 'ok' });
}
