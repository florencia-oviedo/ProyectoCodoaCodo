// dbClient.js - Cliente de base de datos ficticio para testing

class DBClient {
  constructor() {
    this.users = new Map([
      ['user1', { id: 'user1', name: 'John Doe', tier: 'VIP' }],
      ['user2', { id: 'user2', name: 'Jane Smith', tier: 'regular' }]
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
}

module.exports = new DBClient();