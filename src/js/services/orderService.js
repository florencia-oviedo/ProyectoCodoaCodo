// js/orderService.js - Módulo de gestión de usuarios para eventos

const USER_ROLES = ['attendee', 'speaker', 'organizer', 'admin'];

/**
 * Registra un nuevo usuario para el evento.
 * @param {string} name
 * @param {string} email
 * @param {string} [role='attendee']
 * @returns {{success: boolean, user?: object, error?: string}}
 */
function registerUser(name, email, role = 'attendee') {
  if (typeof name !== 'string' || name.trim() === '') {
    return { success: false, error: 'Nombre inválido' };
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Email inválido' };
  }

  if (!USER_ROLES.includes(role)) {
    return { success: false, error: `Rol inválido: debe ser uno de ${USER_ROLES.join(', ')}` };
  }

  const userId = 'USER-' + Date.now().toString(36).toUpperCase();

  return {
    success: true,
    user: {
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      registeredAt: new Date().toISOString(),
      active: true
    }
  };
}

/**
 * Actualiza el rol de un usuario.
 * @param {object} user
 * @param {string} newRole
 * @returns {{success: boolean, user?: object, error?: string}}
 */
function updateUserRole(user, newRole) {
  if (!user || typeof user !== 'object') {
    return { success: false, error: 'Usuario inválido' };
  }

  if (!USER_ROLES.includes(newRole)) {
    return { success: false, error: `Rol inválido: debe ser uno de ${USER_ROLES.join(', ')}` };
  }

  return {
    success: true,
    user: {
      ...user,
      role: newRole,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Obtiene un resumen del usuario.
 * @param {object} user
 * @returns {string}
 */
function getUserSummary(user) {
  if (!user || typeof user !== 'object') {
    return 'Usuario inválido';
  }

  return `Usuario ${user.userId}: ${user.name} (${user.email}), rol ${user.role}, ${user.active ? 'activo' : 'inactivo'}.`;
}

function showUserServiceStartupMessage() {
  console.log('orderService.js (ahora userService) cargado: disponible registerUser(), updateUserRole() y getUserSummary()');
}

document.addEventListener('DOMContentLoaded', showUserServiceStartupMessage);

window.registerUser = registerUser;
window.updateUserRole = updateUserRole;
window.getUserSummary = getUserSummary;
