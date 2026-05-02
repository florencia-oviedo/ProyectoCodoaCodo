// dbClient.test.js - Test Suite for dbClient.js

jest.mock('../dbClient', () => ({
  users: new Map([
    ['user1', {
      id: 'user1',
      name: 'John Doe',
      tier: 'VIP',
      status: 'active', // Essential for Account Status Validation
      dailyLimit: 1000,
      monthlyLimit: 5000,
      accountType: 'debit',
      balance: 500,
      email: 'john@example.com',
      phoneVerified: true, // New field added
      accountCurrency: 'USD', // Essential for Currency Consistency check
      homeCountry: 'USA', // Essential for Geo-Consistency check
      preferences: { emailNotifications: true },
      deviceTokens: ['token1'],
      transactionHistory: [{ amount: 100 }, { amount: 50 }],
      totalSpent: 150,
      transactionCount: 2
    }],
    ['user2', {
      id: 'user2',
      name: 'Jane Smith',
      tier: 'regular',
      status: 'active',
      dailyLimit: 500,
      monthlyLimit: 2000,
      accountType: 'credit',
      balance: 0,
      email: 'jane@example.com',
      phoneVerified: false, // New field added
      accountCurrency: 'USD',
      homeCountry: 'USA',
      preferences: { emailNotifications: false },
      deviceTokens: [],
      transactionHistory: [],
      totalSpent: 0,
      transactionCount: 0
    }]
  ]),
  products: new Map([
    ['prod1', { id: 'prod1', name: 'Product 1', stock: 100, price: 50 }],
    ['prod2', { id: 'prod2', name: 'Product 2', stock: 50, price: 75 }]
  ]),
  orders: []
}));

const dbClient = require('../dbClient');

describe('dbClient', () => {
  describe('getUser', () => {
    it('should return a user object when user exists', async () => {
      const user = await dbClient.getUser('user1');
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
        phoneVerified: true, // New field added
        accountCurrency: 'USD', // Essential for Currency Consistency check
        homeCountry: 'USA', // Essential for Geo-Consistency check
        preferences: { emailNotifications: true },
        deviceTokens: ['token1'],
        transactionHistory: [{ amount: 100 }, { amount: 50 }],
        totalSpent: 150,
        transactionCount: 2
      });
    });

    it('should throw an error when user does not exist', async () => {
      await expect(dbClient.getUser('user3')).rejects.toThrow('User not found');
    });
  });

  describe('getUserTrustedIPs', () => {
    it('should return a list of trusted IPs for the user', async () => {
      const ips = await dbClient.getUserTrustedIPs('user1');
      expect(ips).toEqual([
        { address: '192.168.1.1', isActive: true },
        { address: '200.45.123.10', isActive: true }
      ]);
    });
  });

  // ... (test cases for other methods)
});
