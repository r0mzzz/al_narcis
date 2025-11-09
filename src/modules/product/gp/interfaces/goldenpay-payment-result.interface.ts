export interface GoldenPayPaymentResult {
  status: {
    code: number;
    message: string;
  };
  paymentKey: string;
  merchantName: string;
  amount: number;
  checkCount: number;
  paymentDate: string;
  cardNumber: string;
  language: string;
  description: string;
  rrn: string;
}
