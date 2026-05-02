// js/ticketService.js - Módulo simple de gestión de tickets para eventos

const TICKET_TYPES = ['general', 'vip', 'student', 'speaker'];

/**
 * Genera un ticket para un evento.
 * @param {string} attendeeName
 * @param {string} email
 * @param {string} [ticketType='general']
 * @returns {{success: boolean, ticket?: object, error?: string}}
 */
function generateTicket(attendeeName, email, ticketType = 'general') {
  if (typeof attendeeName !== 'string' || attendeeName.trim() === '') {
    return { success: false, error: 'Nombre del asistente inválido' };
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Email inválido' };
  }

  if (!TICKET_TYPES.includes(ticketType)) {
    return { success: false, error: `Tipo de ticket inválido: debe ser uno de ${TICKET_TYPES.join(', ')}` };
  }

  const ticketId = 'TICKET-' + Date.now().toString(36).toUpperCase();
  const qrCode = 'QR-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  return {
    success: true,
    ticket: {
      ticketId,
      attendeeName: attendeeName.trim(),
      email: email.trim().toLowerCase(),
      ticketType,
      qrCode,
      issuedAt: new Date().toISOString(),
      valid: true
    }
  };
}

/**
 * Valida un ticket por su ID.
 * @param {string} ticketId
 * @returns {{success: boolean, valid?: boolean, error?: string}}
 */
function validateTicket(ticketId) {
  if (typeof ticketId !== 'string' || !ticketId.startsWith('TICKET-')) {
    return { success: false, error: 'ID de ticket inválido' };
  }

  // Simulación: en un sistema real, buscaría en base de datos
  const isValid = Math.random() > 0.1; // 90% de probabilidad de válido

  return {
    success: true,
    valid: isValid
  };
}

/**
 * Obtiene un resumen del ticket.
 * @param {object} ticket
 * @returns {string}
 */
function getTicketSummary(ticket) {
  if (!ticket || typeof ticket !== 'object') {
    return 'Ticket inválido';
  }

  return `Ticket ${ticket.ticketId} para ${ticket.attendeeName} (${ticket.ticketType}), ${ticket.valid ? 'válido' : 'inválido'}.`;
}

function showTicketServiceStartupMessage() {
  console.log('ticketService.js cargado: disponible generateTicket(), validateTicket() y getTicketSummary()');
}

document.addEventListener('DOMContentLoaded', showTicketServiceStartupMessage);

window.generateTicket = generateTicket;
window.validateTicket = validateTicket;
window.getTicketSummary = getTicketSummary;