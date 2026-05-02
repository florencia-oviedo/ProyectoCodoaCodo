// js/notificationService.js - Módulo simple de notificaciones y mensajes

const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'];

/**
 * Crea una notificación simple con tipo y mensaje.
 * @param {string} type
 * @param {string} message
 * @param {string} [recipient='user']
 * @returns {{success: boolean, notification?: object, error?: string}}
 */
function createNotification(type, message, recipient = 'user') {
  if (!NOTIFICATION_TYPES.includes(type)) {
    return { success: false, error: `Tipo inválido: debe ser uno de ${NOTIFICATION_TYPES.join(', ')}` };
  }

  if (typeof message !== 'string' || message.trim() === '') {
    return { success: false, error: 'Mensaje inválido' };
  }

  const notificationId = 'NOTIF-' + Date.now().toString(36).toUpperCase();

  return {
    success: true,
    notification: {
      notificationId,
      type,
      message: message.trim(),
      recipient,
      createdAt: new Date().toISOString(),
      read: false
    }
  };
}

/**
 * Marca una notificación como leída.
 * @param {object} notification
 * @returns {{success: boolean, notification?: object, error?: string}}
 */
function markAsRead(notification) {
  if (!notification || typeof notification !== 'object') {
    return { success: false, error: 'Notificación inválida' };
  }

  return {
    success: true,
    notification: {
      ...notification,
      read: true,
      readAt: new Date().toISOString()
    }
  };
}

/**
 * Obtiene un resumen de notificaciones.
 * @param {Array<object>} notifications
 * @returns {string}
 */
function getNotificationsSummary(notifications) {
  if (!Array.isArray(notifications)) {
    return 'Lista de notificaciones inválida';
  }

  const total = notifications.length;
  const unread = notifications.filter(n => !n.read).length;

  return `Total: ${total} notificaciones, ${unread} sin leer.`;
}

function showNotificationServiceStartupMessage() {
  console.log('notificationService.js cargado: disponible createNotification(), markAsRead() y getNotificationsSummary()');
}

document.addEventListener('DOMContentLoaded', showNotificationServiceStartupMessage);

window.createNotification = createNotification;
window.markAsRead = markAsRead;
window.getNotificationsSummary = getNotificationsSummary;