// dbClient.js - Mock Database Client for Testing

class DBClient {
  constructor() {
    this.users = new Map([
      ['user1', {
        id: 'user1',
        name: 'John Doe',
        tier: 'VIP',
        status: 'active', // Essential for the Account Status Validation
        dailyLimit: 1000,
        monthlyLimit: 5000,
        accountType: 'debit',
        balance: 500,
        email: 'john@example.com',
        accountCurrency: 'USD', // Supported for Currency Consistency check
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
        accountCurrency: 'USD',
        preferences: { emailNotifications: false },
        deviceTokens: [],
        transactionHistory: [],
        totalSpent: 0,
        transactionCount: 0
      }]
    ]);

    this.products = new Map([
      ['prod1', { id: 'prod1', name: 'Product 1', stock: 100, price: 50 }],
      ['prod2', { id: 'prod2', name: 'Product 2', stock: 50, price: 75 }]
    ]);

    this.orders = [];
  }

  /**
   * Retrieves a user by ID. Required for OrderProcessor tests.
   */
  async getUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async getProductStock(productId) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product.stock;
  }

  async updateProductStock(productId, newStock) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    product.stock = newStock;
    this.products.set(productId, product);
  }

  async createOrder(orderData) {
    const orderId = 'ORD-' + Date.now();
    this.orders.push({ id: orderId, ...orderData });
    return orderId;
  }

  /**
   * Mock daily transactions for Velocity Checks.
   */
  async getUserTransactionsToday(userId) {
    return [
      { amount: 50 },
      { amount: 25 }
    ];
  }

  /**
   * Mock monthly transactions for limit validation.
   */
  async getUserTransactionsThisMonth(userId) {
    return [
      { amount: 100 },
      { amount: 75 },
      { amount: 200 }
    ];
  }

  /**
   * Updates user data in the Map.
   */
  async updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    Object.assign(user, updates);
    this.users.set(userId, user);
  }

  async saveTransaction(transaction) {
    console.log(`Transaction saved successfully: ${transaction.id}`);
  }

  async logFraudAttempt(fraudData) {
    console.log(`Security Alert: Fraud attempt logged for user ${fraudData.userId}`);
  }

  async saveFailedTransaction(failedData) {
    console.log(`Failed transaction recorded for user: ${failedData.userId}`);
  }

  /**
   * Retrieve a specific transaction (Mock)
   */
  async getTransaction(transactionId) {
    return {
      id: transactionId,
      userId: 'user1',
      amount: 100,
      status: 'completed',
      timestamp: new Date()
    };
  }

  async updateTransaction(transactionId, updates) {
    console.log(`Transaction ${transactionId} updated with status: ${updates.status}`);
  }
}

// Exporting a singleton instance to maintain state across tests
// At the very end of dbClient.js
const dbClientInstance = new DBClient();
module.exports = dbClientInstance;