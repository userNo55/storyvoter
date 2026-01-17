export const dynamic = 'force-dynamic'; // Это запретит попытки статической сборки этого роута

import { NextResponse } from 'next/server';
import { YooCheckout } from 'yookassa-ts';
import { supabase } from '../../supabase'; // Ваш клиент supabase с сервисным ключом!

const checkout = new YooCheckout({ 
  shopId: process.env.YOOKASSA_SHOP_ID!, 
  secretKey: process.env.YOOKASSA_SECRET_KEY! 
});

export async function POST(req: Request) {
  const { amount, userId } = await req.json();

  try {
    const payment = await checkout.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      payment_method_data: {
        type: 'bank_card',
      },
      confirmation: {
        type: 'redirect',
        return_url: 'https://vash-sait.ru', // Куда вернуть пользователя после оплаты
      },
      description: `Пополнение баланса (Молнии) для пользователя ${userId}`,
      metadata: {
        userId: userId, // Важно передать ID пользователя здесь
      },
    });

    return NextResponse.json({ confirmationUrl: payment.confirmation.confirmation_url });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 });
  }
}
