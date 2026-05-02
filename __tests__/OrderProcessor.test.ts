import { OrderProcessor } from '../OrderProcessor';

describe('OrderProcessor', () => {
  let orderProcessor;

  beforeEach(() => {
    orderProcessor = new OrderProcessor();
  });

  it('should process a valid order', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [
        { productId: '1', quantity: 1, price: 10 },
        { productId: '2', quantity: 2, price: 20 }
      ],
      paymentMethod: {}
    };

    // Act
    const result = await orderProcessor.processOrder(orderData);

    // Assert
    expect(result).toEqual({
      success: true,
      orderId: '1',
      total: 50,
      discounts: { vip: 0, day: 0, coupon: 0, total: 0 }
    });
  });

  it('should handle invalid order data', async () => {
    // Arrange
    const orderData = {};

    // Act & Assert
    await expect(orderProcessor.processOrder(orderData)).rejects.toThrow('Datos del pedido inválidos');
  });

  it('should handle insufficient stock', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [
        { productId: '1', quantity: 1, price: 10 },
        { productId: '2', quantity: 2, price: 20 }
      ],
      paymentMethod: {}
    };
    // Mock stock validation to fail for one item
    jest.spyOn(orderProcessor, 'validateStock').mockResolvedValueOnce({
      valid: false,
      message: 'Producto 2: stock 1, requerido 2'
    });

    // Act & Assert
    await expect(orderProcessor.processOrder(orderData)).rejects.toThrow('Stock insuficiente: Producto 2: stock 1, requerido 2');
  });

  it('should handle failed payment', async () => {
    // Arrange
    const orderData = {
      userId: '123',
      items: [
        { productId: '1', quantity: 1, price: 10 },
        { productId: '2', quantity: 2, price: 20 }
      ],
      paymentMethod: {}
    };
    // Mock payment processing to fail
    jest.spyOn(orderProcessor, 'processPayment').mockResolvedValueOnce({
      success: false,
      error: 'Error de pago'
    });

    // Act & Assert
    await expect(orderProcessor.processOrder(orderData)).rejects.toThrow('Pago fallido: Error de pago');
  });
});
