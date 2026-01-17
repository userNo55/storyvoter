export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
// Используем require, чтобы избежать проблем с ES-модулями в этой библиотеке
const { YooCheckout } = require('yookassa-ts');

export async function POST(req: Request) {
  // Проверяем наличие ключей внутри функции
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return NextResponse.json({ error: "Ключи ЮKassa не настроены в Vercel" }, { status: 500 });
  }

  try {
    // Инициализация внутри POST-запроса
    const checkout = new YooCheckout({
      shopId: shopId,
      secretKey: secretKey,
    });

    const { amount, userId } = await req.json();

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
        return_url: 'https://xn----7sbfkf5bif1g.ru', // Укажите ваш реальный домен на Vercel
      },
      description: `Пополнение баланса (Молнии) для пользователя ${userId}`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ confirmationUrl: payment.confirmation.confirmation_url });
  } catch (error: any) {
    console.error('PAY_ERROR:', error);
    return NextResponse.json({ error: 'Ошибка создания платежа: ' + error.message }, { status: 500 });
  }
}
