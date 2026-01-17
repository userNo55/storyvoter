export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Явно указываем среду выполнения

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const body = await req.json();
    const amount = body.amount;
    const userId = body.userId;

    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const res = await fetch('https://api.yookassa.ru', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': crypto.randomUUID(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
        confirmation: { 
            type: 'redirect', 
            return_url: 'https://storyvoter.vercel.app' // Укажите ваш адрес на vercel
        },
        capture: true,
        description: `Пополнение ${userId}`,
        metadata: { userId }
      }),
    });

    const data = await res.json();
    return NextResponse.json({ confirmationUrl: data.confirmation?.confirmation_url || null });
  } catch (err) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
