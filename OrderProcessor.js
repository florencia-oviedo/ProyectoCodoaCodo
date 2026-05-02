// OrderProcessor.js - Servicio de backend para procesamiento de pedidos
// Este archivo está diseñado para ser complejo y requerir mocks/spies en tests

const dbClient = require('./dbClient'); // Cliente de base de datos ficticio
const paymentService = require('./paymentService'); // Servicio de pagos ficticio (ej. Stripe-like)

class OrderProcessor {
  constructor() {
    this.stockCache = new Map(); // Caché interno para stock
    this.logger = {
      info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
      warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
      error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`)
    };
  }

  /**
   * Procesa un pedido completo
   * @param {object} orderData - Datos del pedido
   * @returns {Promise<object>} Resultado del procesamiento
   */
  async processOrder(orderData) {
    try {
      // Validación inicial
      this.validateOrderData(orderData);

      const { userId, items, paymentMethod } = orderData;
      const user = await dbClient.getUser(userId);

      // Validar stock para todos los items (llamada asíncrona)
      const stockValidation = await this.validateStock(items);
      if (!stockValidation.valid) {
        throw new Error(`Stock insuficiente: ${stockValidation.message}`);
      }

      // Calcular total con descuentos complejos
      const subtotal = this.calculateSubtotal(items);
      const discounts = this.calculateDiscounts(subtotal, user, new Date());
      const total = this.applyDiscounts(subtotal, discounts);

      // Procesar pago
      const paymentResult = await this.processPayment(total, paymentMethod);

      if (!paymentResult.success) {
        // Revertir stock si el pago falla
        await this.revertStock(items);
        throw new Error(`Pago fallido: ${paymentResult.error}`);
      }

      // Actualizar stock y crear pedido
      await this.updateStock(items);
      const orderId = await dbClient.createOrder({
        userId,
        items,
        subtotal,
        discounts,
        total,
        paymentId: paymentResult.transactionId
      });

      this.logger.info(`Pedido ${orderId} procesado exitosamente para usuario ${userId}`);

      return {
        success: true,
        orderId,
        total,
        discounts
      };

    } catch (error) {
      this.logger.error(`Error procesando pedido: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida los datos del pedido
   * @param {object} orderData
   */
  validateOrderData(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Datos del pedido inválidos');
    }

    const requiredFields = ['userId', 'items', 'paymentMethod'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('El pedido debe contener al menos un item');
    }

    // Validar estructura de items
    orderData.items.forEach((item, index) => {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Item ${index} inválido: requiere productId y quantity > 0`);
      }
    });
  }

  /**
   * Valida el stock de los items (simula race condition con timeout)
   * @param {Array} items
   * @returns {Promise<object>}
   */
  async validateStock(items) {
    // Simular race condition: delay aleatorio
    const delay = Math.random() * 100; // 0-100ms
    await new Promise(resolve => setTimeout(resolve, delay));

    for (const item of items) {
      const cachedStock = this.stockCache.get(item.productId);
      let availableStock;

      if (cachedStock !== undefined) {
        availableStock = cachedStock;
      } else {
        availableStock = await dbClient.getProductStock(item.productId);
        this.stockCache.set(item.productId, availableStock);
      }

      if (availableStock < item.quantity) {
        return {
          valid: false,
          message: `Producto ${item.productId}: stock ${availableStock}, requerido ${item.quantity}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Calcula el subtotal de los items
   * @param {Array} items
   * @returns {number}
   */
  calculateSubtotal(items) {
    return items.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return total + (price * quantity);
    }, 0);
  }

  /**
   * Calcula descuentos complejos con precisión decimal
   * @param {number} subtotal
   * @param {object} user
   * @param {Date} currentDate
   * @returns {object}
   */
  calculateDiscounts(subtotal, user, currentDate) {
    const discounts = { vip: 0, day: 0, total: 0 };

    // Descuento VIP: 15% si es VIP y subtotal > 100
    if (user.tier === 'VIP' && subtotal > 100) {
      discounts.vip = subtotal * 0.15;
    }

    // Descuento día: 5% adicional si es martes
    if (currentDate.getDay() === 2) { // 0=domingo, 2=martes
      discounts.day = subtotal * 0.05;
    }

    // Total con precisión decimal
    discounts.total = Math.round((discounts.vip + discounts.day) * 100) / 100;

    return discounts;
  }

  /**
   * Aplica descuentos al subtotal con precisión
   * @param {number} subtotal
   * @param {object} discounts
   * @returns {number}
   */
  applyDiscounts(subtotal, discounts) {
    const total = subtotal - discounts.total;
    return Math.max(0, Math.round(total * 100) / 100); // Evitar negativos y redondear
  }

  /**
   * Procesa el pago
   * @param {number} amount
   * @param {object} paymentMethod
   * @returns {Promise<object>}
   */
  async processPayment(amount, paymentMethod) {
    // Simular timeout o error aleatorio para testing
    if (Math.random() < 0.1) { // 10% de probabilidad de timeout
      await new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
    }

    return await paymentService.charge(amount, paymentMethod);
  }

  /**
   * Actualiza el stock después de un pedido exitoso
   * @param {Array} items
   */
  async updateStock(items) {
    for (const item of items) {
      const currentStock = await dbClient.getProductStock(item.productId);
      const newStock = currentStock - item.quantity;
      await dbClient.updateProductStock(item.productId, newStock);

      // Actualizar caché
      this.stockCache.set(item.productId, newStock);
    }
  }

  /**
   * Revierte el stock en caso de error
   * @param {Array} items
   */
  async revertStock(items) {
    for (const item of items) {
      const currentStock = await dbClient.getProductStock(item.productId);
      const revertedStock = currentStock + item.quantity;
      await dbClient.updateProductStock(item.productId, revertedStock);

      // Actualizar caché
      this.stockCache.set(item.productId, revertedStock);
    }
  }
}

module.exports = OrderProcessor;