// js/payments2.js - Mini-módulo de facturación y cobros similar a payments.js

/**
 * Valida un código de moneda ISO 4217.
 * @param {string} currency
 * @returns {boolean}
 */
function validateCurrencyCode(currency) {
  return typeof currency === 'string' && /^[A-Z]{3}$/.test(currency);
}

/**
 * Calcula el total de una lista de items de factura.
 * @param {Array<{description: string, quantity: number, unitPrice: number}>} items
 * @returns {number}
 */
function calculateInvoiceTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return total + quantity * unitPrice;
  }, 0);
}

/**
 * Genera un número de factura único de prueba.
 * @returns {string}
 */
function generateInvoiceNumber() {
  return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Crea una factura simulada para prueba.
 * @param {{name: string, email: string}} customer
 * @param {Array<{description: string, quantity: number, unitPrice: number}>} items
 * @param {string} [currency='ARS']
 * @returns {{success: boolean, invoice?: object, error?: string}}
 */
function createInvoice(customer, items, currency = 'ARS') {
  if (!customer || typeof customer.name !== 'string' || customer.name.trim() === '') {
    return { success: false, error: 'Cliente inválido' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'La factura debe contener al menos un ítem' };
  }

  if (!validateCurrencyCode(currency)) {
    return { success: false, error: 'Código de moneda inválido' };
  }

  const total = calculateInvoiceTotal(items);
  const invoiceNumber = generateInvoiceNumber();

  return {
    success: true,
    invoice: {
      invoiceNumber,
      customer: {
        name: customer.name,
        email: customer.email || '',
      },
      items: items.map(item => ({
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      })),
      currency,
      total,
      issuedAt: new Date().toISOString(),
      status: 'pending'
    }
  };
}

/**
 * Aplica un descuento porcentual a una factura de prueba.
 * @param {object} invoice
 * @param {number} discountPercent
 * @returns {{success: boolean, invoice?: object, error?: string}}
 */
function applyDiscount(invoice, discountPercent) {
  if (!invoice || typeof invoice.total !== 'number') {
    return { success: false, error: 'Factura inválida' };
  }

  if (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 100) {
    return { success: false, error: 'Descuento inválido' };
  }

  const discountAmount = invoice.total * (discountPercent / 100);
  const newTotal = Math.max(0, invoice.total - discountAmount);

  return {
    success: true,
    invoice: {
      ...invoice,
      discountPercent,
      discountAmount,
      total: Number(newTotal.toFixed(2)),
      status: 'discounted'
    }
  };
}

/**
 * Obtiene un resumen de la factura.
 * @param {object} invoice
 * @returns {string}
 */
function getInvoiceSummary(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    return 'Factura inválida';
  }

  const itemCount = invoice.items ? invoice.items.length : 0;
  const total = invoice.total || 0;
  const currency = invoice.currency || 'ARS';

  return `Factura ${invoice.invoiceNumber}: ${itemCount} item(s), total ${total} ${currency}, estado ${invoice.status || 'unknown'}.`;
}

function showPayments2StartupMessage() {
  console.log('payments2.js cargado: disponible createInvoice(), applyDiscount(), getInvoiceSummary()');
}

document.addEventListener('DOMContentLoaded', showPayments2StartupMessage);

window.createInvoice = createInvoice;
window.applyDiscount = applyDiscount;
window.calculateInvoiceTotal = calculateInvoiceTotal;
window.validateCurrencyCode = validateCurrencyCode;
window.getInvoiceSummary = getInvoiceSummary;
