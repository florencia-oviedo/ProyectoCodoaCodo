// js/loggerService.js - Servicio simple de logging

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LOG_LEVELS.INFO;
const logs = [];

/**
 * Establece el nivel de logging mínimo.
 * @param {string} level
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
  }
}

/**
 * Loggea un mensaje de debug.
 * @param {string} message
 * @param {*} data
 */
function debug(message, data = null) {
  log('DEBUG', message, data);
}

/**
 * Loggea un mensaje de info.
 * @param {string} message
 * @param {*} data
 */
function info(message, data = null) {
  log('INFO', message, data);
}

/**
 * Loggea un mensaje de warning.
 * @param {string} message
 * @param {*} data
 */
function warn(message, data = null) {
  log('WARN', message, data);
}

/**
 * Loggea un mensaje de error.
 * @param {string} message
 * @param {*} data
 */
function error(message, data = null) {
  log('ERROR', message, data);
}

/**
 * Función interna para loggear.
 * @param {string} level
 * @param {string} message
 * @param {*} data
 */
function log(level, message, data) {
  if (LOG_LEVELS[level] < currentLogLevel) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };

  logs.push(logEntry);

  // También loggea en consola
  const consoleMethod = level.toLowerCase();
  if (console[consoleMethod]) {
    console[consoleMethod](`[${level}] ${message}`, data || '');
  } else {
    console.log(`[${level}] ${message}`, data || '');
  }
}

/**
 * Obtiene todos los logs.
 * @returns {object[]}
 */
function getLogs() {
  return [...logs];
}

/**
 * Limpia los logs.
 */
function clearLogs() {
  logs.length = 0;
}

/**
 * Obtiene logs filtrados por nivel.
 * @param {string} level
 * @returns {object[]}
 */
function getLogsByLevel(level) {
  return logs.filter(log => log.level === level);
}

function showLoggerServiceStartupMessage() {
  console.log('loggerService.js cargado: disponible debug(), info(), warn(), error(), etc.');
}

document.addEventListener('DOMContentLoaded', showLoggerServiceStartupMessage);

window.setLogLevel = setLogLevel;
window.debug = debug;
window.info = info;
window.warn = warn;
window.error = error;
window.getLogs = getLogs;
window.clearLogs = clearLogs;
window.getLogsByLevel = getLogsByLevel;