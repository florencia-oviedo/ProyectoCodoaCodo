// js/scheduleService.js - Servicio simple de gestión de horarios para eventos

/**
 * Crea un horario vacío.
 * @returns {object} Horario con sesiones
 */
function createSchedule() {
  return {
    sessions: [],
    createdAt: new Date().toISOString()
  };
}

/**
 * Agrega una sesión al horario.
 * @param {object} schedule
 * @param {string} title
 * @param {string} startTime
 * @param {string} endTime
 * @param {string} speaker
 * @returns {{success: boolean, schedule?: object, error?: string}}
 */
function addSessionToSchedule(schedule, title, startTime, endTime, speaker) {
  if (!schedule || !Array.isArray(schedule.sessions)) {
    return { success: false, error: 'Horario inválido' };
  }

  if (typeof title !== 'string' || title.trim() === '') {
    return { success: false, error: 'Título de sesión inválido' };
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return { success: false, error: 'Horarios inválidos (formato HH:MM)' };
  }

  if (startTime >= endTime) {
    return { success: false, error: 'Hora de fin debe ser posterior a la de inicio' };
  }

  // Verificar conflictos
  const conflict = schedule.sessions.some(session =>
    (startTime < session.endTime && endTime > session.startTime)
  );

  if (conflict) {
    return { success: false, error: 'Conflicto de horario con otra sesión' };
  }

  const sessionId = 'SESSION-' + Date.now().toString(36).toUpperCase();

  const newSession = {
    sessionId,
    title: title.trim(),
    startTime,
    endTime,
    speaker: speaker || 'Sin asignar',
    duration: calculateDuration(startTime, endTime)
  };

  return {
    success: true,
    schedule: {
      ...schedule,
      sessions: [...schedule.sessions, newSession]
    }
  };
}

/**
 * Valida formato de tiempo HH:MM.
 * @param {string} time
 * @returns {boolean}
 */
function isValidTime(time) {
  return typeof time === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Calcula duración en minutos entre dos tiempos.
 * @param {string} start
 * @param {string} end
 * @returns {number}
 */
function calculateDuration(start, end) {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

/**
 * Obtiene sesiones ordenadas por hora de inicio.
 * @param {object} schedule
 * @returns {object[]}
 */
function getSortedSessions(schedule) {
  if (!schedule || !Array.isArray(schedule.sessions)) {
    return [];
  }

  return [...schedule.sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Obtiene resumen del horario.
 * @param {object} schedule
 * @returns {string}
 */
function getScheduleSummary(schedule) {
  if (!schedule || !Array.isArray(schedule.sessions)) {
    return 'Horario inválido';
  }

  const totalSessions = schedule.sessions.length;
  const totalDuration = schedule.sessions.reduce((sum, s) => sum + s.duration, 0);

  return `Horario con ${totalSessions} sesión(es), duración total ${totalDuration} minutos.`;
}

/**
 * Elimina una sesión del horario por ID.
 * @param {object} schedule
 * @param {string} sessionId
 * @returns {{success: boolean, schedule?: object, error?: string}}
 */
function removeSessionFromSchedule(schedule, sessionId) {
  if (!schedule || !Array.isArray(schedule.sessions)) {
    return { success: false, error: 'Horario inválido' };
  }

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return { success: false, error: 'ID de sesión inválido' };
  }

  const sessionIndex = schedule.sessions.findIndex(session => session.sessionId === sessionId);

  if (sessionIndex === -1) {
    return { success: false, error: 'Sesión no encontrada' };
  }

  const updatedSessions = [...schedule.sessions];
  updatedSessions.splice(sessionIndex, 1);

  return {
    success: true,
    schedule: {
      ...schedule,
      sessions: updatedSessions
    }
  };
}

/**
 * Actualiza una sesión existente.
 * @param {object} schedule
 * @param {string} sessionId
 * @param {object} updates
 * @returns {{success: boolean, schedule?: object, error?: string}}
 */
function updateSession(schedule, sessionId, updates) {
  if (!schedule || !Array.isArray(schedule.sessions)) {
    return { success: false, error: 'Horario inválido' };
  }

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return { success: false, error: 'ID de sesión inválido' };
  }

  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'Actualizaciones inválidas' };
  }

  const sessionIndex = schedule.sessions.findIndex(session => session.sessionId === sessionId);

  if (sessionIndex === -1) {
    return { success: false, error: 'Sesión no encontrada' };
  }

  const session = schedule.sessions[sessionIndex];

  // Validar nuevos horarios si se proporcionan
  if (updates.startTime && updates.endTime) {
    if (!isValidTime(updates.startTime) || !isValidTime(updates.endTime)) {
      return { success: false, error: 'Horarios inválidos (formato HH:MM)' };
    }
    if (updates.startTime >= updates.endTime) {
      return { success: false, error: 'Hora de fin debe ser posterior a la de inicio' };
    }

    // Verificar conflictos con otras sesiones
    const otherSessions = schedule.sessions.filter((s, idx) => idx !== sessionIndex);
    const conflict = otherSessions.some(s =>
      (updates.startTime < s.endTime && updates.endTime > s.startTime)
    );

    if (conflict) {
      return { success: false, error: 'Conflicto de horario con otra sesión' };
    }
  }

  const updatedSession = {
    ...session,
    title: updates.title || session.title,
    startTime: updates.startTime || session.startTime,
    endTime: updates.endTime || session.endTime,
    speaker: updates.speaker || session.speaker,
    duration: updates.startTime && updates.endTime
      ? calculateDuration(updates.startTime, updates.endTime)
      : session.duration
  };

  const updatedSessions = [...schedule.sessions];
  updatedSessions[sessionIndex] = updatedSession;

  return {
    success: true,
    schedule: {
      ...schedule,
      sessions: updatedSessions
    }
  };
}

function showScheduleServiceStartupMessage() {
  console.log('scheduleService.js cargado: disponible createSchedule(), addSessionToSchedule(), removeSessionFromSchedule(), updateSession(), etc.');
}

document.addEventListener('DOMContentLoaded', showScheduleServiceStartupMessage);

window.createSchedule = createSchedule;
window.addSessionToSchedule = addSessionToSchedule;
window.getSortedSessions = getSortedSessions;
window.getScheduleSummary = getScheduleSummary;
window.removeSessionFromSchedule = removeSessionFromSchedule;
window.updateSession = updateSession;