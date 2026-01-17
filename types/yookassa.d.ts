declare module 'yookassa-ts' {
  export class YooCheckout {
    constructor(config: { shopId: string; secretKey: string });
    createPayment(data: any, idempotenceKey?: string): Promise<any>;
    // можно добавить другие методы по мере необходимости
  }
}
