// dbClient.test.js - Test Suite for dbClient.js

jest.mock('./dbClient', () => ({
  getUser: jest.fn(),
  updateUser: jest.fn()
}));

const dbClient = require('./dbClient');

describe('dbClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user object when user exists', async () => {
      // Arrange
      const userId = 'user1';

      // Act
      const user = await dbClient.getUser(userId);

      // Assert
      expect(user).toEqual({
        id: 'user1',
        name: 'John Doe',
        tier: 'VIP',
        status: 'active',
        dailyLimit: 1000,
        monthlyLimit: 5000,
        accountType: 'debit',
        balance: 500,
        email: 'john@example.com',
        accountCurrency: 'USD',
        homeCountry: 'USA',
        preferences: { emailNotifications: true },
        deviceTokens: ['token1'],
        transactionHistory: [{ amount: 100 }, { amount: 50 }],
        totalSpent: 150,
        transactionCount: 2
      });
    });

    it('should throw error when user does not exist', async () => {
      // Arrange
      const userId = 'user3';

      // Act & Assert
      await expect(dbClient.getUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user object when user exists', async () => {
      // Arrange
      const userId = 'user1';
      const updatedUserData = {
        name: 'Johnny Doe',
        email: 'john@example.org',
        preferences: { emailNotifications: false }
      };

      // Act
      await dbClient.updateUser(userId, updatedUserData);

      // Assert
      expect(dbClient.updateUser).toHaveBeenCalledWith(userId, updatedUserData);
    });

    it('should throw error when user does not exist', async () => {
      // Arrange
      const userId = 'user3';
      const updatedUserData = {
        name: 'Johnny Doe',
        email: 'john@example.org',
        preferences: { emailNotifications: false }
      };

      // Act & Assert
      await expect(dbClient.updateUser(userId, updatedUserData)).rejects.toThrow('User not found');
    });
  });
});
