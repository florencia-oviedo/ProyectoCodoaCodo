// paymentGateway.js - Gateway de pagos ficticio (Stripe-like) para testing

class PaymentGateway {
  async charge(paymentData) {
    // Simular procesamiento de pago
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('invalid_amount');
    }

    if (!paymentData.paymentMethod) {
      throw new Error('invalid_payment_method');
    }

    // Simular fallo aleatorio (10% de probabilidad)
    if (Math.random() < 0.1) {
      throw new Error('card_declined');
    }

    // Simular éxito
    const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    return {
      id: transactionId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      timestamp: new Date().toISOString(),
      status: 'succeeded'
    };
  }
}

module.exports = new PaymentGateway();