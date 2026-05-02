const OrderProcessor = require('../OrderProcessor');

jest.mock('../dbClient', () => ({
  getUserTransactionsToday: jest.fn(),
  getUserTransactionsThisMonth: jest.fn(),
  getUser: jest.fn(),
  getUserTrustedIPs: jest.fn(),
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
    it('should throw error if daily limit exceeded', async () => {
      // Arrange
      dbClient.getUserTransactionsToday.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 100 },
        { id: 3, amount: 100 },
        { id: 4, amount: 100 },
        { id: 5, amount: 100 },
        { id: 6, amount: 100 },
        { id: 7, amount: 100 },
        { id: 8, amount: 100 },
        { id: 9, amount: 100 },
        { id: 10, amount: 100 },
        { id: 11, amount: 100 },
        { id: 12, amount: 100 },
        { id: 13, amount: 100 },
        { id: 14, amount: 100 },
        { id: 15, amount: 100 },
        { id: 16, amount: 100 },
        { id: 17, amount: 100 },
        { id: 18, amount: 100 },
        { id: 19, amount: 100 },
        { id: 20, amount: 100 },
        { id: 21, amount: 100 },
        { id: 22, amount: 100 },
        { id: 23, amount: 100 },
        { id: 24, amount: 100 },
        { id: 25, amount: 100 },
        { id: 26, amount: 100 },
        { id: 27, amount: 100 },
        { id: 28, amount: 100 },
        { id: 29, amount: 100 },
        { id: 30, amount: 100 },
        { id: 31, amount: 100 },
        { id: 32, amount: 100 },
        { id: 33, amount: 100 },
        { id: 34, amount: 100 },
        { id: 35, amount: 100 },
        { id: 36, amount: 100 },
        { id: 37, amount: 100 },
        { id: 38, amount: 100 },
        { id: 39, amount: 100 },
        { id: 40, amount: 100 },
        { id: 41, amount: 100 },
        { id: 42, amount: 100 },
        { id: 43, amount: 100 },
        { id: 44, amount: 100 },
        { id: 45, amount: 100 },
        { id: 46, amount: 100 },
        { id: 47, amount: 100 },
        { id: 48, amount: 100 },
        { id: 49, amount: 100 },
        { id: 50, amount: 100 },
        { id: 51, amount: 100 },
        { id: 52, amount: 100 },
        { id: 53, amount: 100 },
        { id: 54, amount: 100 },
        { id: 55, amount: 100 },
        { id: 56, amount: 100 },
        { id: 57, amount: 100 },
        { id: 58, amount: 100 },
        { id: 59, amount: 100 },
        { id: 60, amount: 100 },
        { id: 61, amount: 100 },
        { id: 62, amount: 100 },
        { id: 63, amount: 100 },
        { id: 64, amount: 100 },
        { id: 65, amount: 100 },
        { id: 66, amount: 100 },
        { id: 67, amount: 100 },
        { id: 68, amount: 100 },
        { id: 69, amount: 100 },
        { id: 70, amount: 100 },
        { id: 71, amount: 100 },
        { id: 72, amount: 100 },
        { id: 73, amount: 100 },
        { id: 74, amount: 100 },
        { id: 75, amount: 100 },
        { id: 76, amount: 100 },
        { id: 77, amount: 100 },
        { id: 78, amount: 100 },
        { id: 79, amount: 100 },
        { id: 80, amount: 100 },
        { id: 81, amount: 100 },
        { id: 82, amount: 100 },
        { id: 83, amount: 100 },
        { id: 84, amount: 100 },
        { id: 85, amount: 100 },
        { id: 86, amount: 100 },
        { id: 87, amount: 100 },
        { id: 88, amount: 100 },
        { id: 89, amount: 100 },
        { id: 90, amount: 100 },
        { id: 91, amount: 100 },
        { id: 92, amount: 100 },
        { id: 93, amount: 100 },
        { id: 94, amount: 100 },
        { id: 95, amount: 100 },
        { id: 96, amount: 100 },
        { id: 97, amount: 100 },
        { id: 98, amount: 100 },
        { id: 99, amount: 100 },
        { id: 100, amount: 100 },
      ]);
      // Act
      await expect(OrderProcessor.checkUserLimits({ id: 1, dailyLimit: 1000, monthlyLimit: 10000 }, 100)).rejects.toThrow('Daily transaction limit exceeded');
      // Assert
      expect(dbClient.getUserTransactionsToday).toHaveBeenCalled();
      expect(dbClient.getUserTransactionsThisMonth).not.toHaveBeenCalled();
    });

    it('should throw error if monthly limit exceeded', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 100 },
        { id: 3, amount: 100 },
        { id: 4, amount: 100 },
        { id: 5, amount: 100 },
        { id: 6, amount: 100 },
        { id: 7, amount: 100 },
        { id: 8, amount: 100 },
        { id: 9, amount: 100 },
        { id: 10, amount: 100 },
        { id: 11, amount: 100 },
        { id: 12, amount: 100 },
        { id: 13, amount: 100 },
        { id: 14, amount: 100 },
        { id: 15, amount: 100 },
        { id: 16, amount: 100 },
        { id: 17, amount: 100 },
        { id: 18, amount: 100 },
        { id: 19, amount: 100 },
        { id: 20, amount: 100 },
        { id: 21, amount: 100 },
        { id: 22, amount: 100 },
        { id: 23, amount: 100 },
        { id: 24, amount: 100 },
        { id: 25, amount: 100 },
        { id: 26, amount: 100 },
        { id: 27, amount: 100 },
        { id: 28, amount: 100 },
        { id: 29, amount: 100 },
        { id: 30, amount: 100 },
        { id: 31, amount: 100 },
        { id: 32, amount: 100 },
        { id: 33, amount: 100 },
        { id: 34, amount: 100 },
        { id: 35, amount: 100 },
        { id: 36, amount: 100 },
        { id: 37, amount: 100 },
        { id: 38, amount: 100 },
        { id: 39, amount: 100 },
        { id: 40, amount: 100 },
        { id: 41, amount: 100 },
        { id: 42, amount: 100 },
        { id: 43, amount: 100 },
        { id: 44, amount: 100 },
        { id: 45, amount: 100 },
        { id: 46, amount: 100 },
        { id: 47, amount: 100 },
        { id: 48, amount: 100 },
        { id: 49, amount: 100 },
        { id: 50, amount: 100 },
        { id: 51, amount: 100 },
        { id: 52, amount: 100 },
        { id: 53, amount: 100 },
        { id: 54, amount: 100 },
        { id: 55, amount: 100 },
        { id: 56, amount: 100 },
        { id: 57, amount: 100 },
        { id: 58, amount: 100 },
        { id: 59, amount: 100 },
        { id: 60, amount: 100 },
        { id: 61, amount: 100 },
        { id: 62, amount: 100 },
        { id: 63, amount: 100 },
        { id: 64, amount: 100 },
        { id: 65, amount: 100 },
        { id: 66, amount: 100 },
        { id: 67, amount: 100 },
        { id: 68, amount: 100 },
        { id: 69, amount: 100 },
        { id: 70, amount: 100 },
        { id: 71, amount: 100 },
        { id: 72, amount: 100 },
        { id: 73, amount: 100 },
        { id: 74, amount: 100 },
        { id: 75, amount: 100 },
        { id: 76, amount: 100 },
        { id: 77, amount: 100 },
        { id: 78, amount: 100 },
        { id: 79, amount: 100 },
        { id: 80, amount: 100 },
        { id: 81, amount: 100 },
        { id: 82, amount: 100 },
        { id: 83, amount: 100 },
        { id: 84, amount: 100 },
        { id: 85, amount: 100 },
        { id: 86, amount: 100 },
        { id: 87, amount: 100 },
        { id: 88, amount: 100 },
        { id: 89, amount: 100 },
        { id: 90, amount: 100 },
        { id: 91, amount: 100 },
        { id: 92, amount: 100 },
        { id: 93, amount: 100 },
        { id: 94, amount: 100 },
        { id: 95, amount: 100 },
        { id: 96, amount: 100 },
        { id: 97, amount: 100 },
        { id: 98, amount: 100 },
        { id: 99, amount: 100 },
        { id: 100, amount: 100 },
      ]);
      // Act
      await expect(OrderProcessor.checkUserLimits({ id: 1, dailyLimit: 1000, monthlyLimit: 10000 }, 100)).rejects.toThrow('Monthly transaction limit exceeded');
      // Assert
      expect(dbClient.getUserTransactionsThisMonth).toHaveBeenCalled();
      expect(dbClient.getUserTransactionsToday).not.toHaveBeenCalled();
    });

    it('should throw error if insufficient funds', async () => {
      // Arrange
      // Act
      await expect(OrderProcessor.checkUserLimits({ id: 1, dailyLimit: 1000, monthlyLimit: 10000, accountType: 'debit', balance: 999 }, 100)).rejects.toThrow('Insufficient funds');
      // Assert
      expect(dbClient.getUserTransactionsToday).not.toHaveBeenCalled();
      expect(dbClient.getUserTransactionsThisMonth).not.toHaveBeenCalled();
    });
  });

  describe('executePaymentWithRetry', () => {
    it('should throw error if user not found', async () => {
      // Arrange
      dbClient.getUser.mockRejectedValue(new Error('User not found'));
      // Act
      await expect(OrderProcessor.executePaymentWithRetry('123456', { idempotencyKey: 'TX_123456', amount: 100 })).rejects.toThrow('User not found');
      // Assert
      expect(dbClient.getUser).toHaveBeenCalled();
      expect(paymentGateway.charge).not.toHaveBeenCalled();
      expect(notificationService.send).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(fraudDetector.analyzeTransaction).not.toHaveBeenCalled();
    });

    // ... (more test cases)
