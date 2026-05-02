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

    // 12. Real-Time Balance Safeguard
    // Ensures debit accounts have sufficient funds before reaching the gateway
    if (user.accountType === 'debit' && user.balance < paymentData.amount) {
      logger.warn(`Transaction Denied: Insufficient balance for user ${user.id}. Available: ${user.balance}, Required: ${paymentData.amount}`);
      throw new Error('INSUFFICIENT_FUNDS: Your account balance is too low for this transaction.');
    }

    // 13. Minimum Transaction Threshold
    // Prevents processing micro-transactions that are not cost-effective
    const ABSOLUTE_MIN_AMOUNT = 1.00; // Define your threshold
    if (paymentData.amount < ABSOLUTE_MIN_AMOUNT) {
      logger.warn(`Business Rule: Transaction of ${paymentData.amount} rejected for being below the minimum threshold.`);
      throw new Error(`TRANSACTION_TOO_SMALL: The minimum amount allowed is ${ABSOLUTE_MIN_AMOUNT} ${paymentData.currency}.`);
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
      logger.warn(`Risk Management: High-value transaction blocked for ${user.tier} user: ${user.id}`);
      throw new Error(`RISK_LIMIT_REACHED: Transactions above ${RISK_THRESHOLD} require a VIP or Premium account tier.`);
    }

    //VALIDACIÓN: Session Expiry (Security)
    // Ensures the transaction request is processed within a valid time window
    const sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
    const requestTimestamp = paymentData.metadata?.timestamp;
    
    if (requestTimestamp) {
      const timeElapsed = Date.now() - new Date(requestTimestamp).getTime();
      if (timeElapsed > sessionTimeout) {
        logger.error(`Security Alert: Session expired for user ${user.id}. Request was ${timeElapsed}ms old.`);
        throw new Error('SESSION_EXPIRED: The transaction request has timed out. Please try again.');
      }
    }

    // 10. IP Address Whitelist Validation (Security)
    // Ensures transaction is from a known or trusted IP address
    const userIps = await dbClient.getUserTrustedIPs(user.id);
    const transactionIp = paymentData.metadata?.ipAddress;
    
    if (transactionIp && userIps.length > 0) {
      const isIpTrusted = userIps.some(ip => ip.address === transactionIp && ip.isActive);
      if (!isIpTrusted) {
        logger.warn(`Security Alert: Transaction from untrusted IP ${transactionIp} for user ${user.id}`);
        throw new Error('UNTRUSTED_IP: Transaction blocked. Please verify from your registered IP.');
      }
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