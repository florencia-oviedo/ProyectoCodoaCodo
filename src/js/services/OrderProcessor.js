const dbClient = require('./dbClient');
const paymentGateway = require('./paymentGateway');
const notificationService = require('./notificationService');
const logger = require('./logger');
const FraudDetector = require('./fraudDetector');

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
  async executePaymentWithRetry(user, paymentData) {
    let lastError;

    // 1. Integrity Validation: Ensure idempotency and required data
    if (!paymentData.idempotencyKey || !paymentData.amount) {
      throw new Error('UNSAFE_TRANSACTION: Missing required integrity keys');
    }

  

    // 2. Frequency Control: Velocity Check (Fraud Prevention)
    const recentTransactions = await dbClient.getUserTransactionsToday(user.id);
    const MAX_DAILY_TRANSACTIONS = 10;
    if (recentTransactions.length >= MAX_DAILY_TRANSACTIONS) {
      logger.error(`Fraud Prevention: User ${user.id} exceeded daily frequency`);
      throw new Error('RATE_LIMIT_EXCEEDED: Too many transactions. Try again tomorrow.');
    }

    // 3. Advanced Fraud Detection: Real-time scoring via FraudDetector
    const fraudScore = await this.fraudDetector.analyzeTransaction(user, paymentData);
    if (fraudScore > 0.8) {
      await this.handleFraudulentTransaction(user, paymentData, fraudScore);
      throw new Error('FRAUD_DETECTION_ALARM: Transaction rejected by security protocols');
    }

    // 4. Availability Validation: Maintenance window (3 AM to 4 AM)
    if (new Date().getHours() === 3) {
      throw new Error('SERVICE_UNAVAILABLE: System is under scheduled maintenance');
    }

    // 5. Payment Method Validation: Check against whitelist
    const allowedMethods = ['credit_card', 'debit_card', 'bank_transfer', 'crypto'];
    if (!allowedMethods.includes(paymentData.paymentMethod)) {
      throw new Error(`INVALID_METHOD: ${paymentData.paymentMethod} is not a valid payment method`);
    }

    // 6. Compliance Validation: Block restricted regions (ISO Codes)
    const blockedCountries = ['IRN', 'PRK', 'SYR'];
    if (blockedCountries.includes(paymentData.metadata?.countryCode)) {
      logger.warn(`Compliance Alert: Transaction blocked for country ${paymentData.metadata.countryCode}`);
      throw new Error('COMPLIANCE_ERROR: Transaction cannot be processed from this region');
    }

    // 7. Currency Validation: Supported fiat currencies
    const supportedCurrencies = ['USD', 'EUR', 'ARS'];
    if (!supportedCurrencies.includes(paymentData.currency)) {
      throw new Error(`INVALID_CURRENCY: ${paymentData.currency} is not supported`);
    }

    // 8. Consistency Validation: Match transaction with account base currency
    if (user.accountCurrency && user.accountCurrency !== paymentData.currency) {
      logger.warn(`Currency Mismatch: User ${user.id} account is ${user.accountCurrency} but payment is ${paymentData.currency}`);
      throw new Error(`CURRENCY_MISMATCH: Cannot process ${paymentData.currency} on a ${user.accountCurrency} account`);
    }

    // 9. Boundary Validation: Transaction amount limits
    const MIN_AMOUNT = 0.50;
    const MAX_AMOUNT = 50000;
    if (paymentData.amount < MIN_AMOUNT || paymentData.amount > MAX_AMOUNT) {
      throw new Error(`AMOUNT_OUT_OF_RANGE: Transaction must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
    }

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
        if (this.isPermanentError(error)) throw error;

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Payment attempt ${attempt} failed, retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Payment failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  isPermanentError(error) {
    const permanentErrors = ['invalid_card', 'card_declined', 'insufficient_funds', 'invalid_amount', 'authentication_required', 'security_violation'];
    const isMatch = permanentErrors.some(code => error.message.toLowerCase().includes(code) || error.code === code);

    if (error.code === 'security_violation' || error.message.includes('FRAUD')) {
      logger.error('CRITICAL_SECURITY_ALERT: Suspected malicious activity detected.');
    }
    return isMatch;
  }

  async updateUserAccount(user, transaction) {
    const updates = {
      lastTransactionId: transaction.id,
      lastTransactionDate: transaction.timestamp,
      totalSpent: (user.totalSpent || 0) + transaction.amount,
      transactionCount: (user.transactionCount || 0) + 1
    };
    if (user.accountType === 'debit') updates.balance = user.balance - transaction.amount;
    await dbClient.updateUser(user.id, updates);
    await dbClient.saveTransaction(transaction);
  }

  async sendNotifications(user, transaction) {
    const promises = [];
    if (user.email && user.preferences?.emailNotifications) {
      promises.push(notificationService.sendEmail({ to: user.email, subject: 'Payment Confirmation', template: 'payment-success', data: { userName: user.name, amount: transaction.amount, currency: transaction.currency, transactionId: transaction.id } }));
    }
    await Promise.allSettled(promises);
  }

  async handleFraudulentTransaction(user, paymentData, fraudScore) {
    await dbClient.logFraudAttempt({ userId: user.id, paymentData, fraudScore, timestamp: new Date(), ipAddress: paymentData.metadata?.ipAddress, deviceId: paymentData.metadata?.deviceId });
    if (fraudScore > 0.95) {
      await dbClient.updateUser(user.id, { status: 'suspended' });
      logger.warn(`User ${user.id} suspended due to high fraud score: ${fraudScore}`);
    }
  }

  async logFailedTransaction(paymentData, error) {
    try {
      await dbClient.saveFailedTransaction({ userId: paymentData.userId, amount: paymentData.amount, currency: paymentData.currency, paymentMethod: paymentData.paymentMethod, error: error.message, timestamp: new Date() });
    } catch (logError) {
      logger.error(`Failed to log failed transaction: ${logError.message}`);
    }
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async refundPayment(transactionId, reason) {
    const transaction = await dbClient.getTransaction(transactionId);
    if (!transaction) throw new Error('Transaction not found');
    const refund = await paymentGateway.refund({ transactionId: transaction.id, amount: transaction.amount, reason });
    await dbClient.updateTransaction(transactionId, { status: 'refunded', refundId: refund.id, refundDate: new Date() });
    return refund;
  }
}

module.exports = OrderProcessor;