jest.mock('../dbClient', () => ({
  getUserTransactionsToday: jest.fn(),
  getUserTransactionsThisMonth: jest.fn(),
  getUser: jest.fn(),
}));
jest.mock('../logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const dbClient = require('../dbClient');
const paymentGateway = require('../paymentGateway');
const notificationService = require('../notificationService');
const logger = require('../logger');
const FraudDetector = require('../fraudDetector');

const dbClient = require('../dbClient');
const paymentGateway = require('../paymentGateway');
const notificationService = require('../notificationService');
const logger = require('../logger');
const FraudDetector = require('../fraudDetector');

class OrderProcessor {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.fraudDetector = new FraudDetector();
  }

  /**
   * Check if user has sufficient balance and hasn't exceeded limits
   */
  async checkUserLimits(user, amount) {
    // Check daily limit
    const todayTransactions = await dbClient.getUserTransactionsToday(user.id);
    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (todayTotal + amount > user.dailyLimit) {
      throw new Error('Daily transaction limit exceeded');
    }

    // Check monthly limit
    const monthTransactions = await dbClient.getUserTransactionsThisMonth(user.id);
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (monthTotal + amount > user.monthlyLimit) {
      throw new Error('Monthly transaction limit exceeded');
    }

    // Check account balance for debit transactions
    if (user.accountType === 'debit' && user.balance < amount) {
      throw new Error('Insufficient funds');
    }
  }

  /**
   * Execute payment with automatic retry on transient failures
   */
  async executePaymentWithRetry(userOrId, paymentData) {
    let lastError;
    let user = userOrId;

    // Support for tests where only userId is passed
    if (typeof userOrId === 'string') {
      user = await dbClient.getUser(userOrId);
    }

    // 11. Profile Integrity Check (KYC Compliance)
    // Ensures the user has a verified email and phone before processing payments
    if (!user.email || !user.phoneVerified) {
      logger.warn(`Compliance Warning: User ${user.id} attempted payment with incomplete profile`);
      throw new Error('INCOMPLETE_PROFILE: Please verify your email and phone number to enable payments.');
    }
    
    // 1. Integrity Validation: Ensure idempotency and required data
    if (!paymentData.idempotencyKey || !paymentData.amount) {
      throw new Error('UNSAFE_TRANSACTION: Missing required integrity keys');
    }

    // Account Status Check
    // Prevents transactions if the user account is not active or verified
    const allowedStatuses = ['active', 'verified'];
    if (!user.status || !allowedStatuses.includes(user.status)) {
      logger.error(`Security Alert: Blocked transaction attempt for ${user.status || 'unknown'} user: ${user.id}`);
      throw new Error(`ACCOUNT_INACTIVE: Transaction rejected. Current status: ${user.status || 'unknown'}`);
    }

    // User Risk Tier Enforcement
    // Restricts high-value transactions for non-VIP or unverified risk profiles
    const RISK_THRESHOLD = 5000;
    const restrictedTiers = ['guest', 'regular', 'unverified'];

    if (paymentData.amount > RISK_THRESHOLD && restrictedTiers.includes(user.tier)) {
      logger.wa
// ... (code truncated)
