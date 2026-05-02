import { OrderProcessor } from '../OrderProcessor';

describe('OrderProcessor', () => {
  let orderProcessor;
  beforeEach(() => {
    orderProcessor = new OrderProcessor();
  });

  it('should process an order successfully', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [{ productId: '1', quantity: 1, price: 10 }],
      paymentMethod: { type: 'card', number: '1234567890123456', cvv: '123' },
      coupon: 'WELCOME10'
    };

    // Act
    const result = await orderProcessor.processOrder(orderData);

    // Assert
    expect(result).toEqual({
      success: true,
      orderId: '1',
      subtotal: 10,
      discounts: { vip: 0, day: 0, coupon: 1, total: 1 },
      taxes: 0.8,
      total: 10.8
    });
  });

  it('should handle invalid order data', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [{ productId: '1', quantity: 1, price: 10 }],
      paymentMethod: { type: 'card', number: '1234567890123456', cvv: '123' },
      coupon: 'INVALIDCOUPON'
    };

    // Act
    try {
      await orderProcessor.processOrder(orderData);
    } catch (error) {
      // Assert
      expect(error.message).toBe('Cupón inválido: INVALIDCOUPON');
    }
  });

  it('should handle insufficient stock', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [{ productId: '1', quantity: 2, price: 10 }],
      paymentMethod: { type: 'card', number: '1234567890123456', cvv: '123' },
      coupon: 'WELCOME10'
    };

    // Act
    try {
      await orderProcessor.processOrder(orderData);
    } catch (error) {
      // Assert
      expect(error.message).toBe('Stock insuficiente: Producto 1: stock 1, requerido 2');
    }
  });

  it('should handle failed payment', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [{ productId: '1', quantity: 1, price: 10 }],
      paymentMethod: { type: 'card', number: '1234567890123456', cvv: '123' },
      coupon: 'WELCOME10'
    };

    // Act
    try {
      await orderProcessor.processOrder(orderData);
    } catch (error) {
      // Assert
      expect(error.message).toBe('Pago fallido: Error de pago');
    }
  });
});
