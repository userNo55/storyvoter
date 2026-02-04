// app/api/pay/route.ts - ОБНОВЛЕННАЯ ВЕРСИЯ
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

    // ЯВНО УКАЗАННЫЙ return_url - меняйте этот URL по необходимости
    const returnUrl = 'https://vilkastory.vercel.app/payment-success';
    
    console.log('🔗 ЖЕСТКО УКАЗАННЫЙ return_url:', returnUrl);

    // ЯВНЫЙ запрос к ЮKassa
    const requestBody = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl, // Прямое использование
      },
      description: `Пополнение баланса на ${coins} голосов в vilkastory`,
      metadata: {
        userId,
        coins,
      },
    };

    console.log('📤 ПОЛНОЕ ТЕЛО ЗАПРОСА к ЮKassa:', JSON.stringify(requestBody, null, 2));

    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`,
        'Idempotence-Key': `${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 11)}`,
      },
      body: JSON.stringify(requestBody), // Используем явно сформированный объект
    });

    const paymentData = await yookassaResponse.json();
    
    console.log('💰 ОТВЕТ ЮKassa (полный):', JSON.stringify(paymentData, null, 2));
    console.log('💰 Статус ответа:', yookassaResponse.status);

    if (paymentData.confirmation && paymentData.confirmation.confirmation_url) {
      return NextResponse.json({ 
        confirmationUrl: paymentData.confirmation.confirmation_url,
        paymentId: paymentData.id,
        // Для отладки возвращаем что получили
        receivedReturnUrl: paymentData.confirmation.return_url
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