// Import the module under test
const OrderProcessor = require('../OrderProcessor');

// Create a mock implementation of the dependencies
jest.mock('../dbClient', () => ({
  getUser: jest.fn(),
  getProductStock: jest.fn(),
  updateProductStock: jest.fn()
}));

// Create a mock implementation of the payment service
jest.mock('../paymentService', () => ({
  charge: jest.fn()
}));

describe('OrderProcessor', () => {
  // Test happy path case
  it('should process an order successfully', async () => {
    // Mock the database client
    const dbClient = require('../dbClient');
    dbClient.getUser.mockResolvedValue({ tier: 'STANDARD' });
    dbClient.getProductStock.mockResolvedValue(10);
    dbClient.updateProductStock.mockResolvedValue();

    // Mock the payment service
    const paymentService = require('../paymentService');
    paymentService.charge.mockResolvedValue({ success: true, transactionId: '12345' });

    // Create an instance of the OrderProcessor
    const orderProcessor = new OrderProcessor();

    // Call the processOrder method with sample data
    const result = await orderProcessor.processOrder({
      userId: '123',
      items: [{ productId: '1', quantity: 1 }],
      paymentMethod: {}
    });

    // Assert that the expected values are returned
    expect(result).toEqual({
      success: true,
      orderId: '1',
      subtotal: 100,
      discounts: { vip: 0, day: 0, coupon: 0, total: 0 },
      taxes: 8,
      shipping: 0,
      total: 108
    });

    // Assert that the expected methods were called
    expect(dbClient.getUser).toHaveBeenCalledWith('123');
    expect(dbClient.getProductStock).toHaveBeenCalledWith('1');
    expect(dbClient.updateProductStock).toHaveBeenCalledWith('1', 9);
    expect(paymentService.charge).toHaveBeenCalledWith(108, {});
  });

  // Test edge case for invalid order data
  it('should handle invalid order data', async () => {
    // Mock the database client
    const dbClient = require('../dbClient');
    dbClient.getUser.mockResolvedValue({ tier: 'STANDARD' });
    dbClient.getProductStock.mockResolvedValue(10);
    dbClient.updateProductStock.mockResolvedValue();

    // Mock the payment service
    const paymentService = require('../paymentService');
    paymentService.charge.mockResolvedValue({ success: true, transactionId: '12345' });

    // Create an instance of the OrderProcessor
    const orderProcessor = new OrderProcessor();

    // Call the processOrder method with invalid data
    try {
      await orderProcessor.processOrder({
        userId: '123',
        items: [],
        paymentMethod: {}
      });
    } catch (error) {
      // Assert that the expected error is thrown
      expect(error.message).toBe('El pedido debe contener al menos un item');
    }

    // Assert that the expected methods were not called
    expect(dbClient.getUser).not.toHaveBeenCalled();
    expect(dbClient.getProductStock).not.toHaveBeenCalled();
    expect(dbClient.updateProductStock).not.toHaveBeenCalled();
    expect(paymentService.charge).not.toHaveBeenCalled();
  });

  // Test error case for payment failure
  it('should handle payment failure', async () => {
    // Mock the database client
    const dbClient = require('../dbClient');
    dbClient.getUser.mockResolvedValue({ tier: 'STANDARD' });
    dbClient.getProductStock.mockResolvedValue(10);
    dbClient.updateProductStock.mockResolvedValue();

    // Mock the payment service
    const paymentService = require('../paymentService');
    paymentService.charge.mockResolvedValue({ success: false, error: 'Payment failed' });

    // Create an instance of the OrderProcessor
    const orderProcessor = new OrderProcessor();

    // Call the processOrder method with sample data
    try {
      await orderProcessor.processOrder({
        userId: '123',
        items: [{ productId: '1', quantity: 1 }],
        paymentMethod: {}
      });
    } catch (error) {
      // Assert that the expected error is thrown
      expect(error.message).toBe('Pago fallido: Payment failed');
    }

    // Assert that the expected methods were called
    expect(dbClient.getUser).toHaveBeenCalledWith('123');
    expect(dbClient.getProductStock).toHaveBeenCalledWith('1');
    expect(dbClient.updateProductStock).toHaveBeenCalledWith('1', 10);
    expect(paymentService.charge).toHaveBeenCalledWith(100, {});
  });
});
