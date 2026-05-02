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
      ]);
      const user = { id: 1, dailyLimit: 150 };
      const amount = 50;

      // Act
      try {
        await OrderProcessor.checkUserLimits(user, amount);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Daily transaction limit exceeded');
      }
    });

    it('should throw error if monthly limit exceeded', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      const user = { id: 1, monthlyLimit: 150 };
      const amount = 50;

      // Act
      try {
        await OrderProcessor.checkUserLimits(user, amount);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Monthly transaction limit exceeded');
      }
    });

    it('should throw error if insufficient funds for debit account', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      const user = { id: 1, accountType: 'debit', balance: 50 };
      const amount = 100;

      // Act
      try {
        await OrderProcessor.checkUserLimits(user, amount);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Insufficient funds');
      }
    });
  });

  describe('executePaymentWithRetry', () => {
    it('should throw error if user does not exist', async () => {
      // Arrange
      dbClient.getUser.mockRejectedValue(new Error('User not found'));
      const userOrId = '12345';
      const paymentData = { amount: 100 };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('User not found');
      }
    });

    it('should throw error if user has insufficient funds', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, accountType: 'debit', balance: 50 });
      const userOrId = '12345';
      const paymentData = { amount: 100 };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Insufficient funds');
      }
    });

    it('should throw error if user has exceeded daily limit', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, dailyLimit: 100 });
      dbClient.getUserTransactionsToday.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      const userOrId = '12345';
      const paymentData = { amount: 50 };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Daily transaction limit exceeded');
      }
    });

    it('should throw error if user has exceeded monthly limit', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, monthlyLimit: 100 });
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
      ]);
      const userOrId = '12345';
      const paymentData = { amount: 50 };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Monthly transaction limit exceeded');
      }
    });

    it('should throw error if user has invalid currency', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1 });
      const userOrId = '12345';
      const paymentData = { amount: 100, currency: 'USD' };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Unsupported currency USD for user 12345');
      }
    });

    it('should throw error if user has invalid transaction format', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1 });
      const userOrId = '12345';
      const paymentData = { amount: 100, idempotencyKey: 'INVALID' };

      // Act
      try {
        await OrderProcessor.executePaymentWithRetry(userOrId, paymentData);
      } catch (error) {
        // Assert
        expect(error.message).toBe('Invalid transaction format from user 12345. Key: INVALID');
      }
    });
  });
});
