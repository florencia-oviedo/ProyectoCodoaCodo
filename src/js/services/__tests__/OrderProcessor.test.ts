const OrderProcessor = require('../OrderProcessor');

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
    it('should work with valid input', () => {
      // Arrange
      const user = { id: '123', dailyLimit: 1000, monthlyLimit: 10000 };
      const amount = 500;
      
      // Act
      OrderProcessor.checkUserLimits(user, amount);
      
      // Assert
      expect(dbClient.getUserTransactionsToday).toHaveBeenCalledWith('123');
      expect(dbClient.getUserTransactionsThisMonth).toHaveBeenCalledWith('123');
      expect(dbClient.getUser).toHaveBeenCalledWith('123');
    });
    
    it('should handle edge case', () => {
      // Arrange
      const user = { id: '123', dailyLimit: 1000, monthlyLimit: 10000 };
      const amount = 0;
      
      // Act
      OrderProcessor.checkUserLimits(user, amount);
      
      // Assert
      expect(dbClient.getUserTransactionsToday).not.toHaveBeenCalled();
      expect(dbClient.getUserTransactionsThisMonth).not.toHaveBeenCalled();
      expect(dbClient.getUser).not.toHaveBeenCalled();
    });
  });
  
  describe('executePaymentWithRetry', () => {
    it('should work with valid input', () => {
      // Arrange
      const user = { id: '123', dailyLimit: 1000, monthlyLimit: 10000 };
      const paymentData = { idempotencyKey: 'TX_123', amount: 500 };
      
      // Act
      OrderProcessor.executePaymentWithRetry(user, paymentData);
      
      // Assert
      expect(paymentGateway.charge).toHaveBeenCalled();
      expect(notificationService.sendNotification).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });
    
    it('should handle edge case', () => {
      // Arrange
      const user = { id: '123', dailyLimit: 1000, monthlyLimit: 10000 };
      const paymentData = { idempotencyKey: 'TX_123', amount: 0 };
      
      // Act
      OrderProcessor.executePaymentWithRetry(user, paymentData);
      
      // Assert
      expect(paymentGateway.charge).not.toHaveBeenCalled();
      expect(notificationService.sendNotification).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
