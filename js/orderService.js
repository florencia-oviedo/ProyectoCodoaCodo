// js/orderService.js - Módulo simple de pedidos y estados

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

/**
 * Crea un pedido simple con items y estado inicial.
 * @param {string} customerName
 * @param {Array<{productId: string, quantity: number}>} items
 * @returns {{success: boolean, orderId?: string, error?: string, order?: object}}
 */
function createOrder(customerName, items) {
  if (typeof customerName !== 'string' || customerName.trim() === '') {
    return { success: false, error: 'Nombre de cliente inválido' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'El pedido debe contener al menos un item' };
  }

  const validItems = items.every(item =>
    item && typeof item.productId === 'string' && item.productId.trim() !== '' &&
    typeof item.quantity === 'number' && item.quantity > 0
  );

  if (!validItems) {
    return { success: false, error: 'Items inválidos: cada item requiere productId y quantity mayor que 0' };
  }

  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    order: {
      orderId,
      customerName: customerName.trim(),
      items: items.map(item => ({ productId: item.productId.trim(), quantity: item.quantity })),
      totalItems,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Actualiza el estado de un pedido.
 * @param {object} order
 * @param {string} newStatus
 * @returns {{success: boolean, order?: object, error?: string}}
 */
function updateOrderStatus(order, newStatus) {
  if (!order || typeof order !== 'object') {
    return { success: false, error: 'Pedido inválido' };
  }

  if (!ORDER_STATUSES.includes(newStatus)) {
    return { success: false, error: `Estado inválido: debe ser uno de ${ORDER_STATUSES.join(', ')}` };
  }

  return {
    success: true,
    order: {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Genera un resumen legible del pedido.
 * @param {object} order
 * @returns {string}
 */
function getOrderSummary(order) {
  if (!order || typeof order !== 'object') {
    return 'Pedido inválido';
  }

  return `Pedido ${order.orderId} para ${order.customerName}: ${order.totalItems} item(s), estado ${order.status}.`;
}

function showOrderServiceStartupMessage() {
  console.log('orderService.js cargado: disponible createOrder(), updateOrderStatus() y getOrderSummary()');
}

document.addEventListener('DOMContentLoaded', showOrderServiceStartupMessage);

window.createOrder = createOrder;
window.updateOrderStatus = updateOrderStatus;
window.getOrderSummary = getOrderSummary;
