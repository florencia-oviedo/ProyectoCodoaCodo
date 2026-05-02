/**
 * PaymentProcessor - Complex business logic module for QABOB demo
 * This module demonstrates:
 * - Complex business logic with multiple validations
 * - External dependencies (database, payment gateway, notification service)
 * - Edge cases (fraud detection, retry logic, error handling)
 * - Async operations with proper error handling
 */

const dbClient = require('./dbClient');
const paymentGateway = require('./paymentGateway');
const notificationService = require('./notificationService');
const fraudDetector = require('./fraudDetector');
const logger = require('./logger');

class PaymentProcessor {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.fraudThreshold = config.fraudThreshold || 0.8;
    this.minAmount = config.minAmount || 0.01;
    this.maxAmount = config.maxAmount || 100000;
  }

  /**
   * Process a payment with full validation, fraud detection, and retry logic
   */
  async processPayment(paymentData) {
    try {
      this.validatePaymentData(paymentData);

      const user = await dbClient.getUser(paymentData.userId);
      if (!user || user.status === 'suspended') {
        throw new Error('User not found or suspended');
      }

      await this.checkUserLimits(user, paymentData.amount);

      const fraudScore = await fraudDetector.analyzeTransaction({
        userId: user.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        ipAddress: paymentData.metadata?.ipAddress,
        deviceId: paymentData.metadata?.deviceId,
        userHistory: user.transactionHistory
      });

      if (fraudScore > this.fraudThreshold) {
        logger.warn(`High fraud score: ${fraudScore} for user ${user.id}`);
        await this.handleFraudulentTransaction(user, paymentData, fraudScore);
        throw new Error('Transaction flagged as potentially fraudulent');
      }

      const transaction = await this.executePaymentWithRetry(user, paymentData);

      await this.updateUserAccount(user, transaction);
      await this.sendNotifications(user, transaction);

      logger.info(`Payment processed: ${transaction.id}`);

      return {
        success: true,
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        timestamp: transaction.timestamp,
        status: 'completed'
      };

    } catch (error) {
      logger.error(`Payment failed: ${error.message}`);
      await this.logFailedTransaction(paymentData, error);
      throw error;
    }
  }

  /**
   * Validate payment data structure and values
   */
  validatePaymentData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid payment data');
    }

    if (!data.userId || typeof data.userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount < this.minAmount || data.amount > this.maxAmount) {
      throw new Error('Invalid amount');
    }

    if (!data.currency || !/^[A-Z]{3}$/.test(data.currency)) {
      throw new Error('Invalid currency code');
    }

    if (!data.paymentMethod || typeof data.paymentMethod !== 'string') {
      throw new Error('Invalid payment method');
    }
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
  async executePaymentWithRetry(user, paymentData) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Payment attempt ${attempt}/${this.maxRetries}`);

        const transaction = await paymentGateway.charge({
          userId: user.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.paymentMethod,
          description: paymentData.metadata?.description || 'Payment',
          idempotencyKey: `${user.id}-${Date.now()}-${attempt}`
        });

        return transaction;

      } catch (error) {
        lastError = error;

        // Don't retry on permanent failures
        if (this.isPermanentError(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Payment attempt ${attempt} failed, retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Payment failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Determine if error is permanent (don't retry) or transient (can retry)
   */
  isPermanentError(error) {
    const permanentErrors = ['invalid_card', 'card_declined', 'insufficient_funds', 'invalid_amount'];
    return permanentErrors.some(code => error.message.toLowerCase().includes(code) || error.code === code);
  }
  async updateUserAccount(user, transaction) {
    const updates = {
      lastTransactionId: transaction.id,
      lastTransactionDate: transaction.timestamp,
      totalSpent: (user.totalSpent || 0) + transaction.amount,
      transactionCount: (user.transactionCount || 0) + 1
    };

    // Update balance for debit accounts
    if (user.accountType === 'debit') {
      updates.balance = user.balance - transaction.amount;
    }

    await dbClient.updateUser(user.id, updates);
    await dbClient.saveTransaction(transaction);
  }

  /**
   * Send notifications about successful payment
   */
  async sendNotifications(user, transaction) {
    const promises = [];

    if (user.email && user.preferences?.emailNotifications) {
      promises.push(notificationService.sendEmail({
        to: user.email,
        subject: 'Payment Confirmation',
        template: 'payment-success',
        data: { userName: user.name, amount: transaction.amount, currency: transaction.currency, transactionId: transaction.id }
      }));
    }

    if (user.deviceTokens?.length > 0) {
      promises.push(notificationService.sendPush({
        tokens: user.deviceTokens,
        title: 'Payment Successful',
        body: `Your payment of ${transaction.amount} ${transaction.currency} was processed`,
        data: { transactionId: transaction.id }
      }));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Handle fraudulent transaction detection
   */
  async handleFraudulentTransaction(user, paymentData, fraudScore) {
    await dbClient.logFraudAttempt({
      userId: user.id,
      paymentData,
      fraudScore,
      timestamp: new Date(),
      ipAddress: paymentData.metadata?.ipAddress,
      deviceId: paymentData.metadata?.deviceId
    });

    await notificationService.sendEmail({
      to: 'security@company.com',
      subject: 'Fraud Alert',
      template: 'fraud-detection',
      data: { userId: user.id, userName: user.name, amount: paymentData.amount, fraudScore, timestamp: new Date() }
    });

    if (fraudScore > 0.95) {
      await dbClient.updateUser(user.id, { status: 'suspended' });
      logger.warn(`User ${user.id} suspended due to high fraud score: ${fraudScore}`);
    }
  }

  /**
   * Log failed transaction for audit and analysis
   */
  async logFailedTransaction(paymentData, error) {
    try {
      await dbClient.saveFailedTransaction({
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
        error: error.message,
        timestamp: new Date(),
        metadata: paymentData.metadata
      });
    } catch (logError) {
      logger.error(`Failed to log failed transaction: ${logError.message}`);
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PaymentProcessor;