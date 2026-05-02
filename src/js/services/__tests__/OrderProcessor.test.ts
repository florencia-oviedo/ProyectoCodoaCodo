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
      
      // Act & Assert
      await expect(OrderProcessor.checkUserLimits({ id: 1, dailyLimit: 1000 }, 100)).rejects.toThrow('Daily transaction limit exceeded');
    });
    
    it('should throw error if monthly limit exceeded', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
        { id: 3, amount: 300 },
      ]);
      
      // Act & Assert
      await expect(OrderProcessor.checkUserLimits({ id: 1, monthlyLimit: 1000 }, 100)).rejects.toThrow('Monthly transaction limit exceeded');
    });
    
    it('should throw error if insufficient funds', async () => {
      // Arrange
      dbClient.getUserTransactionsThisMonth.mockResolvedValue([
        { id: 1, amount: 100 },
        { id: 2, amount: 200 },
        { id: 3, amount: 300 },
      ]);
      
      // Act & Assert
      await expect(OrderProcessor.checkUserLimits({ id: 1, accountType: 'debit', balance: 1000 }, 1000)).rejects.toThrow('Insufficient funds');
    });
  });
  
  describe('executePaymentWithRetry', () => {
    it('should throw error if user not found', async () => {
      // Arrange
      dbClient.getUser.mockRejectedValue(new Error('User not found'));
      
      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry('123', {})).rejects.toThrow('User not found');
    });
    
    it('should throw error if invalid integrity key', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, dailyLimit: 1000, monthlyLimit: 1000 });
      
      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry('123', { idempotencyKey: 'invalid', amount: 100 })).rejects.toThrow('UNSAFE_TRANSACTION: Missing required integrity keys');
    });
    
    it('should throw error if invalid transaction key format', async () => {
      // Arrange
      dbClient.getUser.mockResolvedValue({ id: 1, dailyLimit: 1000, monthlyLimit: 1000 });
      
      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry('123', { idempotencyKey: 'TX', amount: 100 })).rejects.toThrow('INVALID_FORMAT: Transaction key must start with TX_.');
    });
    
    // ... (additional test cases)
