const dbClient = require('./dbClient');
const paymentGateway = require('./paymentGateway');
const notificationService = require('./notificationService');
const logger = require('./logger');

class PaymentProcessor {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000;
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
    const permanentErrors = [
      'invalid_card',
      'card_declined',
      'insufficient_funds',
      'invalid_amount',
      'authentication_required'
    ];

    return permanentErrors.some(code => 
      error.message.toLowerCase().includes(code) || 
      error.code === code
    );
  }

  /**
   * Update user account after successful payment
   */
  async updateUserAccount(user, transacti
// ... (code truncated)
