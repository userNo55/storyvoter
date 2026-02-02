// app/api/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, userId, coins } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    if (!amount) {
      return NextResponse.json({ error: 'Укажите сумму оплаты' }, { status: 400 });
    }

    // Определяем URL для возврата - критически важно!
    const host = request.headers.get('host') || 'storyvoter.vercel.app';
    const returnUrl = `https://${host}/payment-success`;
    
    console.log('🔗 Возвращаем пользователя на:', returnUrl);

    // Здесь интеграция с ЮKassa
    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`,
        'Idempotence-Key': `${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 11)}`,
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl, // Вот этот параметр отвечает за "Вернуться на сайт"
        },
        description: `Пополнение баланса на ${coins} голосов в StoryVoter`,
        metadata: {
          userId,
          coins,
        },
      }),
    });

    const paymentData = await yookassaResponse.json();
    
    // Логируем для отладки
    console.log('💰 Ответ ЮKassa:', {
      paymentId: paymentData.id,
      confirmationUrl: paymentData.confirmation?.confirmation_url,
      returnUrl: paymentData.confirmation?.return_url,
      error: paymentData.error
    });

    if (paymentData.confirmation && paymentData.confirmation.confirmation_url) {
      return NextResponse.json({ 
        confirmationUrl: paymentData.confirmation.confirmation_url,
        paymentId: paymentData.id 
      });
    } else {
      console.error('❌ Ошибка ЮKassa:', paymentData);
      return NextResponse.json({ 
        error: paymentData.description || 'Ошибка создания платежа'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('🔥 Ошибка платежа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}