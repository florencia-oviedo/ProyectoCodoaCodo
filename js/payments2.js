// js/test.js - Simulador simple de pagos para testear

/**
 * Valida un número de tarjeta de crédito de 16 dígitos.
 * @param {string} cardNumber
 * @returns {boolean}
 */
function validateCardNumber(cardNumber) {
  return typeof cardNumber === 'string' && /^\d{16}$/.test(cardNumber);
}

/**
 * Valida un CVV de 3 dígitos.
 * @param {string} cvv
 * @returns {boolean}
 */
function validateCvv(cvv) {
  return typeof cvv === 'string' && /^\d{3}$/.test(cvv);
}

/**
 * Procesa un pago de prueba.
 * @param {number} amount
 * @param {string} cardNumber
 * @param {string} cvv
 * @returns {{success: boolean, transactionId?: string, error?: string, amount?: number, status?: string}}
 */
function processTestPayment(amount, cardNumber, cvv) {
  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, error: 'Monto inválido: debe ser mayor que 0' };
  }

  if (!validateCardNumber(cardNumber)) {
    return { success: false, error: 'Número de tarjeta inválido: debe tener 16 dígitos' };
  }

  if (!validateCvv(cvv)) {
    return { success: false, error: 'CVV inválido: debe tener 3 dígitos' };
  }

  const transactionId = 'TEST-TXN-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  return {
    success: true,
    transactionId,
    amount,
    status: 'approved'
  };
}

/**
 * Simula un reembolso de prueba.
 * @param {string} transactionId
 * @param {number} amount
 * @returns {{success: boolean, refundId?: string, error?: string, status?: string}}
 */
function refundTestPayment(transactionId, amount) {
  if (!transactionId) {
    return { success: false, error: 'ID de transacción requerido' };
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, error: 'Monto de reembolso inválido' };
  }

  const refundId = 'TEST-REF-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  return {
    success: true,
    refundId,
    originalTransactionId: transactionId,
    amount,
    status: 'refunded'
  };
}

/**
 * Mensaje de arranque para verificar que `test.js` se cargó correctamente.
 */
function showTestStartupMessage() {
  console.log('test.js cargado: disponible processTestPayment() y refundTestPayment()');
}

document.addEventListener('DOMContentLoaded', showTestStartupMessage);

window.processTestPayment = processTestPayment;
window.refundTestPayment = refundTestPayment;
window.validateCardNumber = validateCardNumber;
window.validateCvv = validateCvv;
