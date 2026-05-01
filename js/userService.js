// userService.js - Servicio de gestión de usuarios
function createUser(username, email, password) {
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }
  
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    username: username,
    email: email,
    createdAt: new Date().toISOString()
  };
}

function deleteUser(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  return {
    success: true,
    deletedUserId: userId,
    deletedAt: new Date().toISOString()
  };
}

module.exports = { createUser, deleteUser };
