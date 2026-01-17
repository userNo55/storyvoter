export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return NextResponse.json({ error: "Ключи не настроены" }, { status: 500 });
  }

  try {
    const { amount, userId } = await req.json();

    // Генерируем уникальный ключ идемпотентности (нужен для ЮKassa)
    const idempotenceKey = crypto.randomUUID();

    // Прямой запрос к API ЮKassa через стандартный fetch
    const response = await fetch('https://api.yookassa.ru', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: 'https://vash-sait.ru', // ЗАМЕНИТЕ НА ВАШ ДОМЕН
        },
        capture: true,
        description: `Пополнение баланса пользователя ${userId}`,
        metadata: {
          userId: userId,
        },
      }),
    });

    const payment = await response.json();

    if (!response.ok) {
      throw new Error(payment.description || 'Ошибка ЮKassa');
    }

    return NextResponse.json({ 
      confirmationUrl: payment.confirmation.confirmation_url 
    });

  } catch (error: any) {
    console.error('PAY_ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
