jest.mock('../dbClient', () => ({
  getUserTransactionsToday: jest.fn(),
  getUserTransactionsThisMonth: jest.fn(),
  getUser: jest.fn(),
  getUserTrustedIPs: jest.fn(),
  getTransaction: jest.fn(),
  logFraudAttempt: jest.fn(),
  updateUser: jest.fn(),
}));

jest.mock('../paymentGateway', () => ({
  charge: jest.fn(),
}));

jest.mock('../notificationService', () => ({
  // Add all methods used from notificationService
}));

jest.mock('../logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../fraudDetector', () => ({
  analyzeTransaction: jest.fn(),
}));

const dbClient = require('../dbClient');
const paymentGateway = require('../paymentGateway');
const notificationService = require('../notificationService');
const logger = require('../logger');
const fraudDetector = require('../fraudDetector');

describe('OrderProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('checkUserLimits', () => {
    it('should validate daily transaction limit', async () => {
      // Arrange
      dbClient.getUserTransactionsToday.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      
      // Act
      await OrderProcessor.checkUserLimits({ id: 1, dailyLimit: 300 }, 100);
      
      // Assert
      expect(dbClient.getUserTransactionsToday).toHaveBeenCalledWith(1);
    });
    
    it('should validate monthly transaction limit', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      
      // Act
      await OrderProcessor.checkUserLimits({ id: 1, monthlyLimit: 300 }, 100);
      
      // Assert
      expect(dbClient.getUserTransactionsThisMonth).toHaveBeenCalledWith(1);
    });
    
    it('should validate account balance', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, accountType: 'debit', balance: 100 });
      
      // Act
      await expect(OrderProcessor.checkUserLimits({ id: 1 }, 200)).rejects.toThrow('Insufficient funds');
      
      // Assert
      expect(dbClient.getUser).toHaveBeenCalledWith(1);
    });
  });
  
  describe('executePaymentWithRetry', () => {
    it('should execute payment with retries', async () => {
      // Arrange
      paymentGateway.charge.mockRejectedValueOnce({ code: '500' }).mockResolvedValueOnce({ id: 1 });
      
      // Act
      const result = await OrderProcessor.executePaymentWithRetry({ id: 1 }, { idempotencyKey: 'TX_123', amount: 100 });
      
      // Assert
      expect(paymentGateway.charge).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 1 });
    });
    
    it('should handle fraud attempt', async () => {
      // Arrange
      fraudDetector.analyzeTransaction.mockResolvedValue({ isFraud: true });
      
      // Act
      await expect(OrderProcessor.executePaymentWithRetry({ id: 1 }, { idempotencyKey: 'TX_123', amount: 100 })).rejects.toThrow('Fraudulent activity detected');
      
      // Assert
      expect(fraudDetector.analyzeTransaction).toHaveBeenCalledWith({ idempotencyKey: 'TX_123', amount: 100 });
    });
  });
});
