// paymentService.js - Servicio de pagos ficticio (Stripe-like) para testing

class PaymentService {
  async charge(amount, paymentMethod) {
    // Simular procesamiento de pago
    if (!amount || amount <= 0) {
      return { success: false, error: 'Monto inválido' };
    }

    if (!paymentMethod || !paymentMethod.cardNumber) {
      return { success: false, error: 'Método de pago inválido' };
    }

    // Simular fallo aleatorio (10% de probabilidad)
    if (Math.random() < 0.1) {
      return { success: false, error: 'Pago rechazado por el banco' };
    }

    // Simular éxito
    const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    return {
      success: true,
      transactionId,
      amount,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new PaymentService();