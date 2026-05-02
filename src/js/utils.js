// js/utils.js - Utilidades simples y puras para facilitar tests unitarios

/**
 * Valida si un string es un email válido.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calcula el descuento aplicado a un precio.
 * @param {number} price
 * @param {number} discountPercent
 * @returns {number}
 */
function calculateDiscount(price, discountPercent) {
  if (typeof price !== 'number' || typeof discountPercent !== 'number') return 0;
  if (price < 0 || discountPercent < 0 || discountPercent > 100) return 0;
  return price * (discountPercent / 100);
}

/**
 * Formatea un número como moneda en ARS.
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') return 'ARS 0.00';
  return `ARS ${amount.toFixed(2)}`;
}

/**
 * Trunca un texto a una longitud máxima, agregando '...' si es necesario.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength) {
  if (typeof text !== 'string' || typeof maxLength !== 'number') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Calcula el promedio de un array de números.
 * @param {number[]} numbers
 * @returns {number}
 */
function calculateAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + (typeof num === 'number' ? num : 0), 0);
  return sum / numbers.length;
}

/**
 * Verifica si un número es primo.
 * @param {number} num
 * @returns {boolean}
 */
function isPrime(num) {
  if (typeof num !== 'number' || num <= 1 || !Number.isInteger(num)) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

/**
 * Convierte una fecha en formato ISO a un string legible.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  if (typeof isoDate !== 'string') return 'Fecha inválida';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-AR');
}

function showUtilsStartupMessage() {
  console.log('utils.js cargado: funciones puras disponibles para tests unitarios');
}

document.addEventListener('DOMContentLoaded', showUtilsStartupMessage);

window.isValidEmail = isValidEmail;
window.calculateDiscount = calculateDiscount;
window.formatCurrency = formatCurrency;
window.truncateText = truncateText;
window.calculateAverage = calculateAverage;
window.isPrime = isPrime;
window.formatDate = formatDate;