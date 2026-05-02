const OrderProcessor = require('../OrderProcessor');

jest.mock('../dbClient', () => ({
  getUserTransactionsToday: jest.fn(),
  getUserTransactionsThisMonth: jest.fn(),
  getUser: jest.fn(),
  getUserTrustedIPs: jest.fn(),
  updateUser: jest.fn(),
  saveTransaction: jest.fn(),
  logFraudAttempt: jest.fn(),
  saveFailedTransaction: jest.fn(),
  getTransaction: jest.fn(),
  updateTransaction: jest.fn(),
}));

jest.mock('../paymentGateway', () => ({
  charge: jest.fn(),
  refund: jest.fn(),
}));

jest.mock('../notificationService', () => ({
  sendEmail: jest.fn(),
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
        { id: 2, amount: 200 },
        { id: 3, amount: 300 },
      ]);

      // Act
      const user = { id: 1, dailyLimit: 500 };
      const amount = 100;

      // Assert
      await expect(OrderProcessor.checkUserLimits(user, amount)).rejects.toThrow('Daily transaction limit exceeded');
      expect(dbClient.getUserTransactionsToday).toHaveBeenCalledWith(user.id);
    });

    it('should throw error if monthly limit exceeded', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
        { id: 3, amount: 300 },
      ]);

      // Act
      const user = { id: 1, monthlyLimit: 500 };
      const amount = 100;

      // Assert
      await expect(OrderProcessor.checkUserLimits(user, amount)).rejects.toThrow('Monthly transaction limit exceeded');
      expect(dbClient.getUserTransactionsThisMonth).toHaveBeenCalledWith(user.id);
    });

    it('should throw error if insufficient balance for debit', async () => {
      // Arrange
      const user = { id: 1, accountType: 'debit', balance: 100 };
      const amount = 200;

      // Act & Assert
      await expect(OrderProcessor.checkUserLimits(user, amount)).rejects.toThrow('Insufficient funds');
    });
  });

  describe('executePaymentWithRetry', () => {
    it('should throw error if user profile is incomplete', async () => {
      // Arrange
      const user = { id: 1, email: '', phoneVerified: false };
      const paymentData = { amount: 100, currency: 'USD' };

      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry(user, paymentData)).rejects.toThrow('INCOMPLETE_PROFILE');
      expect(logger.warn).toHaveBeenCalledWith('Compliance Warning: User 1 attempted payment with incomplete profile');
    });

    it('should throw error if insufficient balance for debit', async () => {
      // Arrange
      const user = { id: 1, accountType: 'debit', balance: 100 };
      const paymentData = { amount: 200, currency: 'USD' };

      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry(user, paymentData)).rejects.toThrow('INSUFFICIENT_FUNDS');
      expect(logger.warn).toHaveBeenCalledWith('Transaction Denied: Insufficient balance for user 1. Available: 100, Required: 200');
    });

    it('should throw error if transaction amount is too small', async () => {
      // Arrange
      const user = { id: 1, accountType: 'debit', balance: 1000 };
      const paymentData = { amount: 0.01, currency: 'USD' };

      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry(user, paymentData)).rejects.toThrow('TRANSACTION_TOO_SMALL');
      expect(logger.warn).toHaveBeenCalledWith('Business Rule: Transaction of 0.01 rejected for being below the minimum threshold.');
    });

    it('should throw error if unsupported currency', async () => {
      // Arrange
      const user = { id: 1, accountType: 'debit', balance: 1000 };
      const paymentData = { amount: 100, currency: 'CNY' };

      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry(user, paymentData)).rejects.toThrow('UNSUPPORTED_CURRENCY');
      expect(logger.error).toHaveBeenCalledWith('Compliance Error: Unsupported currency CNY for user 1');
    });
  });
});
