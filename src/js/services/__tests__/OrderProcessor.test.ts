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
      const user = { id: '123', dailyLimit: 100, monthlyLimit: 200 };
      const amount = 150;
      dbClient.getUserTransactionsToday.mockResolvedValue([
        { id: '1', amount: 50 },
        { id: '2', amount: 50 },
        { id: '3', amount: 50 },
      ]);
      
      // Act & Assert
      await expect(OrderProcessor.checkUserLimits(user, amount)).rejects.toThrow('Daily transaction limit exceeded');
      expect(dbClient.getUserTransactionsToday).toHaveBeenCalledWith('123');
    });
    
    // Add more test cases for other scenarios
  });
  
  describe('executePaymentWithRetry', () => {
    it('should throw error if user not found', async () => {
      // Arrange
      const userOrId = '123';
      const paymentData = { idempotencyKey: 'TX_123', amount: 100 };
      dbClient.getUser.mockRejectedValue(new Error('User not found'));
      
      // Act & Assert
      await expect(OrderProcessor.executePaymentWithRetry(userOrId, paymentData)).rejects.toThrow('User not found');
      expect(dbClient.getUser).toHaveBeenCalledWith('123');
    });
    
    // Add more test cases for other scenarios
  });
});
