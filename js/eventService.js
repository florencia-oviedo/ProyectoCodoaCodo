// js/eventService.js - Módulo simple de gestión de eventos y sesiones

const EVENT_TYPES = ['conference', 'workshop', 'panel', 'networking'];

/**
 * Crea un evento nuevo.
 * @param {string} title
 * @param {string} description
 * @param {string} date
 * @param {string} [type='conference']
 * @returns {{success: boolean, event?: object, error?: string}}
 */
function createEvent(title, description, date, type = 'conference') {
  if (typeof title !== 'string' || title.trim() === '') {
    return { success: false, error: 'Título del evento inválido' };
  }

  if (typeof description !== 'string' || description.trim() === '') {
    return { success: false, error: 'Descripción del evento inválida' };
  }

  if (typeof date !== 'string' || isNaN(Date.parse(date))) {
    return { success: false, error: 'Fecha inválida' };
  }

  if (!EVENT_TYPES.includes(type)) {
    return { success: false, error: `Tipo de evento inválido: debe ser uno de ${EVENT_TYPES.join(', ')}` };
  }

  const eventId = 'EVENT-' + Date.now().toString(36).toUpperCase();

  return {
    success: true,
    event: {
      eventId,
      title: title.trim(),
      description: description.trim(),
      date,
      type,
      sessions: [],
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Agrega una sesión a un evento.
 * @param {object} event
 * @param {string} sessionTitle
 * @param {string} speaker
 * @param {string} time
 * @returns {{success: boolean, event?: object, error?: string}}
 */
function addSessionToEvent(event, sessionTitle, speaker, time) {
  if (!event || typeof event !== 'object') {
    return { success: false, error: 'Evento inválido' };
  }

  if (typeof sessionTitle !== 'string' || sessionTitle.trim() === '') {
    return { success: false, error: 'Título de sesión inválido' };
  }

  if (typeof speaker !== 'string' || speaker.trim() === '') {
    return { success: false, error: 'Nombre del speaker inválido' };
  }

  if (typeof time !== 'string' || time.trim() === '') {
    return { success: false, error: 'Hora inválida' };
  }

  const sessionId = 'SESSION-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  const newSession = {
    sessionId,
    title: sessionTitle.trim(),
    speaker: speaker.trim(),
    time: time.trim()
  };

  return {
    success: true,
    event: {
      ...event,
      sessions: [...event.sessions, newSession]
    }
  };
}

/**
 * Obtiene un resumen del evento.
 * @param {object} event
 * @returns {string}
 */
function getEventSummary(event) {
  if (!event || typeof event !== 'object') {
    return 'Evento inválido';
  }

  const sessionCount = event.sessions ? event.sessions.length : 0;
  return `Evento ${event.eventId}: ${event.title} (${event.type}) el ${event.date}, ${sessionCount} sesión(es).`;
}

function showEventServiceStartupMessage() {
  console.log('eventService.js cargado: disponible createEvent(), addSessionToEvent() y getEventSummary()');
}

document.addEventListener('DOMContentLoaded', showEventServiceStartupMessage);

window.createEvent = createEvent;
window.addSessionToEvent = addSessionToEvent;
window.getEventSummary = getEventSummary;