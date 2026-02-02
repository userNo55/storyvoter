export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('✅ [ТЕСТ] Вебхук вызван!');
  
  try {
    // Просто пытаемся прочитать тело
    const text = await request.text();
    console.log('📦 [ТЕСТ] Тело запроса:', text.substring(0, 500)); // Логируем начало
    
    return NextResponse.json({ received: true, status: 'ok' });
    
  } catch (error) {
    console.error('🔥 [ТЕСТ] Ошибка в тестовом вебхуке:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}