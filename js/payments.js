// payments.js - Módulo de procesamiento de pagos
// Este archivo NO tiene tests y debería generar alerta CRÍTICA

/**
 * Procesa un pago con tarjeta de crédito
 * @param {number} amount - Monto a cobrar
 * @param {string} cardNumber - Número de tarjeta (16 dígitos)
 * @param {string} cvv - Código de seguridad (3 dígitos)
 * @returns {Object} Resultado del pago
 */
function processPayment(amount, cardNumber, cvv) {
  // Validar monto
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount: must be greater than 0');
  }
  
  if (amount > 10000) {
    throw new Error('Amount exceeds maximum limit of 10000');
  }
  
  // Validar tarjeta
  if (!cardNumber || cardNumber.length !== 16) {
    throw new Error('Invalid card number: must be 16 digits');
  }
  
  // Validar CVV
  if (!cvv || cvv.length !== 3) {
    throw new Error('Invalid CVV: must be 3 digits');
  }
  
  // Simular procesamiento con gateway de pago
  const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  
  return {
    success: true,
    transactionId: transactionId,
    amount: amount,
    timestamp: new Date().toISOString(),
    status: 'approved'
  };
}

/**
 * Procesa un reembolso
 * @param {string} transactionId - ID de la transacción original
 * @param {number} amount - Monto a reembolsar
 * @returns {Object} Resultado del reembolso
 */
function refundPayment(transactionId, amount) {
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }
  
  if (!amount || amount <= 0) {
    throw new Error('Invalid refund amount');
  }
  
  const refundId = 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  
  return {
    success: true,
    refundId: refundId,
    originalTransactionId: transactionId,
    amount: amount,
    timestamp: new Date().toISOString(),
    status: 'refunded'
  };
}

/**
 * Calcula la comisión de procesamiento del pago
 * @param {number} amount - Monto del pago
 * @param {number} [feePercent=2.5] - Porcentaje de comisión
 * @returns {number} Monto de la comisión
 */
function calculatePaymentFee(amount, feePercent = 2.5) {
  if (typeof amount !== 'number' || amount <= 0) {
    return 0;
  }
  
  const fee = amount * (feePercent / 100);
  return Math.round(fee * 100) / 100;
}

module.exports = {
  processPayment,
  refundPayment,
  calculatePaymentFee
};
