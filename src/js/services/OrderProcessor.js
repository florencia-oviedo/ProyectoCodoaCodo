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
    //Validación de integridad antes de empezar los reintentos
    if (!paymentData.idempotencyKey && !paymentData.amount) {
       throw new Error('UNSAFE_TRANSACTION: Missing required integrity keys');
    }

    // NEW VALIDATION: Account Status Check
    // Blocks transactions if the user account is not in 'active' status
    const allowedStatuses = ['active', 'verified'];
    if (!allowedStatuses.includes(user.status)) {
      logger.error(`Security Alert: Blocked transaction attempt for ${user.status} user: ${user.id}`);
      throw new Error(`ACCOUNT_INACTIVE: Transaction rejected. Current account status: ${user.status}`);
    }

    // Control de Frecuencia (Velocity Check)
    const recentTransactions = await dbClient.getUserTransactionsToday(user.id);
    const MAX_DAILY_TRANSACTIONS = 10;
    
    if (recentTransactions.length >= MAX_DAILY_TRANSACTIONS) {
       logger.error(`Fraud Prevention: User ${user.id} exceeded daily transaction frequency`);
       throw new Error('RATE_LIMIT_EXCEEDED: Too many transactions in a short period. Please try again tomorrow.');
    }

    // NEW VALIDATION: Advanced Fraud Detection via FraudDetector class[cite: 1]
    const fraudScore = await this.fraudDetector.analyzeTransaction(user, paymentData);
    if (fraudScore > 0.8) {
      await this.handleFraudulentTransaction(user, paymentData, fraudScore);
      throw new Error('FRAUD_DETECTION_ALARM: Transaction rejected by security protocols');
    }

    //Ventana de mantenimiento (3 AM a 4 AM)
    const currentHour = new Date().getHours();
    if (currentHour === 3) {
       throw new Error('SERVICE_UNAVAILABLE: System is under scheduled maintenance between 03:00 and 04:00');
    }

    //Métodos de pago permitidos
    const allowedMethods = ['credit_card', 'debit_card', 'bank_transfer', 'crypto'];
    if (!allowedMethods.includes(paymentData.paymentMethod)) {
       throw new Error(`INVALID_METHOD: ${paymentData.paymentMethod} is not a valid payment method`);
    }

    //Países con restricciones (Compliance)
    const blockedCountries = ['IRN', 'PRK', 'SYR']; // ISO Codes
    if (blockedCountries.includes(paymentData.metadata?.countryCode)) {
       logger.warn(`Compliance Alert: Transaction blocked for country ${paymentData.metadata.countryCode}`);
       throw new Error('COMPLIANCE_ERROR: Transaction cannot be processed from this region');
    }

    // Monedas soportadas
    const supportedCurrencies = ['USD', 'EUR', 'ARS'];
    if (!supportedCurrencies.includes(paymentData.currency)) {
       throw new Error(`INVALID_CURRENCY: ${paymentData.currency} is not supported`);
    }

    // NUEVA VALIDACIÓN: Coincidencia con la moneda de la cuenta del usuario
    // Consistency Validation: Ensure transaction currency matches account base currency
    if (user.accountCurrency && user.accountCurrency !== paymentData.currency) {
       logger.warn(`Currency Mismatch: User ${user.id} account is ${user.accountCurrency} but payment is ${paymentData.currency}`);
       throw new Error(`CURRENCY_MISMATCH: Cannot process ${paymentData.currency} on a ${user.accountCurrency} account`);
    }

    //Límites de monto (Min/Max)
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
    const permanentErrors = [
      'invalid_card',
      'card_declined',
      'insufficient_funds',
      'invalid_amount',
      'authentication_required',
      'security_violation' // <-- Nuevo
    ];

    const isMatch = permanentErrors.some(code => 
      error.message.toLowerCase().includes(code) || 
      error.code === code
    );

    // NUEVO: Si detectamos una violación de seguridad, forzamos un log crítico.
    if (error.code === 'security_violation' || error.message.includes('FRAUD')) {
       logger.error('CRITICAL_SECURITY_ALERT: Suspected malicious activity detected.');
       // Esto obligará a QABOB a crear un test que verifique el log de seguridad.
    }

    return isMatch;
  }

  /**
   * Update user account after successful payment
   */
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

    // Email notification
    if (user.email && user.preferences?.emailNotifications) {
      promises.push(
        notificationService.sendEmail({
          to: user.email,
          subject: 'Payment Confirmation',
          template: 'payment-success',
          data: {
            userName: user.name,
            amount: transaction.amount,
            currency: transaction.currency,
            transactionId: transaction.id
          }
        })
      );
    }

    // SMS notification for large amounts
    if (user.phone && transaction.amount > 1000) {
      promises.push(
        notificationService.sendSMS({
          to: user.phone,
          message: `Payment of ${transaction.amount} ${transaction.currency} processed successfully. ID: ${transaction.id}`
        })
      );
    }

    // Push notification
    if (user.deviceTokens?.length > 0) {
      promises.push(
        notificationService.sendPush({
          tokens: user.deviceTokens,
          title: 'Payment Successful',
          body: `Your payment of ${transaction.amount} ${transaction.currency} was processed`,
          data: { transactionId: transaction.id }
        })
      );
    }

    // Don't fail the payment if notifications fail
    await Promise.allSettled(promises);
  }

  /**
   * Handle fraudulent transaction detection
   */
  async handleFraudulentTransaction(user, paymentData, fraudScore) {
    // Log fraud attempt
    await dbClient.logFraudAttempt({
      userId: user.id,
      paymentData,
      fraudScore,
      timestamp: new Date(),
      ipAddress: paymentData.metadata?.ipAddress,
      deviceId: paymentData.metadata?.deviceId
    });

    // Notify security team
    await notificationService.sendEmail({
      to: 'security@company.com',
      subject: 'Fraud Alert',
      template: 'fraud-detection',
      data: {
        userId: user.id,
        userName: user.name,
        amount: paymentData.amount,
        fraudScore,
        timestamp: new Date()
      }
    });

    // Suspend user if fraud score is very high
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

  /**
   * Refund a payment
   */
  async refundPayment(transactionId, reason) {
    const transaction = await dbClient.getTransaction(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'refunded') {
      throw new Error('Transaction already refunded');
    }

    const refund = await paymentGateway.refund({
      transactionId: transaction.id,
      amount: transaction.amount,
      reason
    });

    await dbClient.updateTransaction(transactionId, {
      status: 'refunded',
      refundId: refund.id,
      refundDate: new Date()
    });

    const user = await dbClient.getUser(transaction.userId);
    await this.sendRefundNotification(user, transaction, refund);

    return refund;
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(user, transaction, refund) {
    if (user.email) {
      await notificationService.sendEmail({
        to: user.email,
        subject: 'Refund Processed',
        template: 'refund-confirmation',
        data: {
          userName: user.name,
          amount: refund.amount,
          currency: refund.currency,
          originalTransactionId: transaction.id,
          refundId: refund.id
        }
      });
    }
  }
}

module.exports = OrderProcessor;

