// js/formValidator.js - Servicio simple de validación de formularios

/**
 * Valida un campo de texto requerido.
 * @param {string} value
 * @param {string} fieldName
 * @returns {{isValid: boolean, error?: string}}
 */
function validateRequired(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  return { isValid: true };
}

/**
 * Valida un email.
 * @param {string} email
 * @returns {{isValid: boolean, error?: string}}
 */
function validateEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return { isValid: false, error: 'Email es requerido' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email inválido' };
  }
  return { isValid: true };
}

/**
 * Valida una longitud mínima de texto.
 * @param {string} value
 * @param {number} minLength
 * @param {string} fieldName
 * @returns {{isValid: boolean, error?: string}}
 */
function validateMinLength(value, minLength, fieldName) {
  if (typeof value !== 'string' || value.length < minLength) {
    return { isValid: false, error: `${fieldName} debe tener al menos ${minLength} caracteres` };
  }
  return { isValid: true };
}

/**
 * Valida un formulario completo.
 * @param {object} formData
 * @param {object} rules
 * @returns {{isValid: boolean, errors: object}}
 */
function validateForm(formData, rules) {
  const errors = {};
  let isValid = true;

  for (const field in rules) {
    const rule = rules[field];
    const value = formData[field];

    if (rule.required) {
      const result = validateRequired(value, field);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
        continue;
      }
    }

    if (rule.email) {
      const result = validateEmail(value);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
        continue;
      }
    }

    if (rule.minLength) {
      const result = validateMinLength(value, rule.minLength, field);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
        continue;
      }
    }
  }

  return { isValid, errors };
}

/**
 * Muestra errores en el DOM (simulación).
 * @param {object} errors
 * @param {string} containerId
 */
function displayErrors(errors, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  for (const field in errors) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = errors[field];
    container.appendChild(errorDiv);
  }
}

function showFormValidatorStartupMessage() {
  console.log('formValidator.js cargado: disponible validateRequired(), validateEmail(), validateForm(), etc.');
}

document.addEventListener('DOMContentLoaded', showFormValidatorStartupMessage);

window.validateRequired = validateRequired;
window.validateEmail = validateEmail;
window.validateMinLength = validateMinLength;
window.validateForm = validateForm;
window.displayErrors = displayErrors;