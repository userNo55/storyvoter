'use client';
import Link from 'next/link';

export default function PurchaseTerms() {
  return (
    <main className="max-w-3xl mx-auto p-6 md:p-12 font-sans text-slate-900 leading-relaxed">
      {/* Кнопка возврата */}
      <header className="mb-12 border-b border-slate-100 pb-6">
        <Link href="/buy" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-2">
          <span>←</span> Назад к оплате
        </Link>
        <h1 className="text-3xl font-black tracking-tight mt-6 uppercase">Соглашение о платных услугах</h1>
        <div className="flex flex-col md:flex-row md:justify-between mt-2 text-slate-400 text-xs font-medium gap-2">
          <span>Платформа VILKA</span>
          <span>Редакция от 21 января 2026 г.</span>
        </div>
      </header>

      <article className="space-y-10">
        {/* Реквизиты исполнителя в начале для прозрачности */}
        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <p className="text-sm font-bold mb-1">Исполнитель:</p>
          <p className="text-sm text-slate-600">
            [ВАШЕ Ф.И.О.] <br />
            ИНН: [ВАШ_ИНН] <br />
            Статус: Плательщик налога на профессиональный доход (самозанятый)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">1. ОБЩИЕ ПОЛОЖЕНИЯ И ПРЕДМЕТ ДОГОВОРА</h2>
          <div className="space-y-3 text-slate-700 text-sm">
            <p>1.1. Данный документ является публичной офертой (далее — Оферта) и содержит все существенные условия по оказанию Исполнителем платных услуг.</p>
            <p>1.2. <strong>Предмет договора:</strong> Исполнитель оказывает Пользователю услуги по предоставлению доступа к дополнительному техническому функционалу и приобретению внутренних игровых единиц («Баллов») на платформе VILKA.</p>
            <p>1.3. <strong>Акцепт:</strong> Полным и безоговорочным принятием (акцептом) условий Оферты считается факт оплаты Пользователем услуг Исполнителя через платежную форму на Сайте.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
          <div className="space-y-3 text-slate-700 text-sm">
            <p><strong>2.1. Обязанности Исполнителя:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Предоставить Пользователю доступ к оплаченному функционалу или начислить соответствующее количество Баллов.</li>
              <li>Обеспечить техническую поддержку в рамках Платформы.</li>
              <li>После получения оплаты сформировать и направить Пользователю официальный электронный чек в соответствии с ФЗ №422.</li>
            </ul>
            <p><strong>2.2. Обязанности Пользователя:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Оплатить услуги по указанному тарифу.</li>
              <li>Соблюдать правила Платформы.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">3. ФИНАНСОВЫЕ УСЛОВИЯ И ВНУТРЕННИЕ ЕДИНИЦЫ</h2>
          <div className="space-y-3 text-slate-700 text-sm">
            <p>3.1. Стоимость услуг и количество начисляемых Баллов указаны на странице оплаты Платформы.</p>
            <p>3.2. Баллы являются внутренними техническими единицами учета на Платформе и не являются средством платежа, электронной валютой или ценными бумагами.</p>
            <p>3.3. Баллы не подлежат обмену на реальные денежные средства и используются исключительно для активации внутреннего функционала (например, голосования).</p>
            <p>3.4. Исполнитель вправе в одностороннем порядке изменять стоимость услуг и правила использования Баллов.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">4. ПОРЯДОК ОКАЗАНИЯ УСЛУГ И ВОЗВРАТЫ</h2>
          <div className="space-y-3 text-slate-700 text-sm">
            <p>4.1. Услуга считается оказанной в момент начисления Баллов на аккаунт Пользователя.</p>
            <p>4.2. <strong>Возврат средств:</strong> Поскольку услуги оказываются в полном объеме сразу после оплаты, возврат денежных средств после начисления Баллов не производится.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">5. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ</h2>
          <p className="text-slate-700 text-sm">5.1. Исполнитель не несет ответственности за перебои в работе Платформы, вызванные техническими сбоями, форс-мажорными обстоятельствами или действиями третьих лиц.</p>
        </section>

        <section className="border-t pt-8 pb-12">
          <h2 className="text-lg font-bold mb-4">6. РАЗРЕШЕНИЕ СПОРОВ И РЕКВИЗИТЫ</h2>
          <p className="text-slate-700 text-sm mb-6">6.1. Все споры решаются путем переговоров. При недостижении согласия споры передаются в суд по месту регистрации Исполнителя.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-900 text-white p-8 rounded-[32px]">
            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold tracking-widest mb-2">Исполнитель</p>
              <p className="font-bold text-base">[ВАШЕ Ф.И.О.]</p>
              <p>ИНН: [ВАШ_ИНН]</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px] font-bold tracking-widest mb-2">Контакты</p>
              <p className="font-bold text-base">[ВАШ_EMAIL]</p>
              <p className="text-slate-400 mt-1 italic">Для претензий и вопросов по оплате</p>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
