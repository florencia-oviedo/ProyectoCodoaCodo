// paymentGateway.js - Mock Payment Gateway

class PaymentGateway {
  async charge(paymentInfo) {
    // Logic to simulate different scenarios for testing
    const amount = paymentInfo.amount;

    // Simulate a permanent error (Card Declined)
    if (amount === 999) {
      const error = new Error('card_declined');
      error.code = 'card_declined';
      throw error;
    }

    // Simulate a security violation
    if (amount === 666) {
      const error = new Error('security_violation');
      error.code = 'security_violation';
      throw error;
    }

    // Simulate successful transaction
    return Promise.resolve({
      id: 'txn_' + Date.now(),
      status: 'succeeded',
      amount: paymentInfo.amount,
      currency: paymentInfo.currency,
      timestamp: new Date()
    });
  }

  async refund({ transactionId, amount, reason }) {
    console.log(`[Refund] Processing refund for ${transactionId} | Reason: ${reason}`);
    return Promise.resolve({
      id: 'ref_' + Date.now(),
      amount: amount,
      status: 'refunded'
    });
  }
}

module.exports = new PaymentGateway();