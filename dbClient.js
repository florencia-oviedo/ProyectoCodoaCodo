// dbClient.js - Cliente de base de datos ficticio para testing

class DBClient {
  constructor() {
    this.users = new Map([
      ['user1', {
        id: 'user1',
        name: 'John Doe',
        tier: 'VIP',
        status: 'active',
        dailyLimit: 1000,
        monthlyLimit: 5000,
        accountType: 'debit',
        balance: 500,
        email: 'john@example.com',
        preferences: { emailNotifications: true },
        deviceTokens: ['token1'],
        transactionHistory: [{ amount: 100 }, { amount: 50 }],
        totalSpent: 150,
        transactionCount: 2
      }],
      ['user2', {
        id: 'user2',
        name: 'Jane Smith',
        tier: 'regular',
        status: 'active',
        dailyLimit: 500,
        monthlyLimit: 2000,
        accountType: 'credit',
        balance: 0,
        email: 'jane@example.com',
        preferences: { emailNotifications: false },
        deviceTokens: [],
        transactionHistory: [],
        totalSpent: 0,
        transactionCount: 0
      }]
    ]);

    this.products = new Map([
      ['prod1', { id: 'prod1', name: 'Producto 1', stock: 100, price: 50 }],
      ['prod2', { id: 'prod2', name: 'Producto 2', stock: 50, price: 75 }]
    ]);

    this.orders = [];
  }

  async getUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }

  async getProductStock(productId) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    return product.stock;
  }

  async updateProductStock(productId, newStock) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    product.stock = newStock;
    this.products.set(productId, product);
  }

  async createOrder(orderData) {
    const orderId = 'ORD-' + Date.now();
    this.orders.push({ id: orderId, ...orderData });
    return orderId;
  }

  async getUserTransactionsToday(userId) {
    // Simular transacciones de hoy
    return [
      { amount: 50 },
      { amount: 25 }
    ];
  }

  async getUserTransactionsThisMonth(userId) {
    // Simular transacciones del mes
    return [
      { amount: 100 },
      { amount: 75 },
      { amount: 200 }
    ];
  }

  async updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    Object.assign(user, updates);
    this.users.set(userId, user);
  }

  async saveTransaction(transaction) {
    // Simular guardar transacción
    console.log('Transaction saved:', transaction.id);
  }

  async logFraudAttempt(fraudData) {
    // Simular logging de intento de fraude
    console.log('Fraud attempt logged:', fraudData.userId);
  }

  async saveFailedTransaction(failedData) {
    // Simular guardar transacción fallida
    console.log('Failed transaction saved:', failedData.userId);
  }
}

module.exports = new DBClient();