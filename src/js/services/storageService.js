// js/storageService.js - Servicio simple de almacenamiento local

/**
 * Guarda un valor en localStorage.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} true si se guardó correctamente
 */
function saveToStorage(key, value) {
  if (typeof key !== 'string' || key.trim() === '') {
    return false;
  }

  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error('Error saving to storage:', error);
    return false;
  }
}

/**
 * Obtiene un valor de localStorage.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*} el valor guardado o defaultValue si no existe
 */
function getFromStorage(key, defaultValue = null) {
  if (typeof key !== 'string' || key.trim() === '') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Error getting from storage:', error);
    return defaultValue;
  }
}

/**
 * Elimina un valor de localStorage.
 * @param {string} key
 * @returns {boolean} true si se eliminó correctamente
 */
function removeFromStorage(key) {
  if (typeof key !== 'string' || key.trim() === '') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from storage:', error);
    return false;
  }
}

/**
 * Limpia todo el localStorage.
 * @returns {boolean} true si se limpió correctamente
 */
function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
}

/**
 * Obtiene todas las claves guardadas en localStorage.
 * @returns {string[]} array de claves
 */
function getStorageKeys() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    return keys;
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
}

function showStorageServiceStartupMessage() {
  console.log('storageService.js cargado: disponible saveToStorage(), getFromStorage(), etc.');
}

document.addEventListener('DOMContentLoaded', showStorageServiceStartupMessage);

window.saveToStorage = saveToStorage;
window.getFromStorage = getFromStorage;
window.removeFromStorage = removeFromStorage;
window.clearStorage = clearStorage;
window.getStorageKeys = getStorageKeys;