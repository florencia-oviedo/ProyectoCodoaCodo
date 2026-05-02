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
   * Validación de límites de usuario (Estática para compatibilidad con tests)
   */
  static async checkUserLimits(user, amount) {
    const todayTransactions = await dbClient.getUserTransactionsToday(user.id);
    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (todayTotal + amount > user.dailyLimit) {
      throw new Error('Daily transaction limit exceeded');
    }

    const monthTransactions = await dbClient.getUserTransactionsThisMonth(user.id);
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (monthTotal + amount > user.monthlyLimit) {
      throw new Error('Monthly transaction limit exceeded');
    }

    if (user.accountType === 'debit' && user.balance < amount) {
      throw new Error('Insufficient funds');
    }
  }

  /**
   * Ejecución de pago con pipeline de 15 validaciones
   * Se define como estático para asegurar compatibilidad con el agente de pruebas
   */
  static async executePaymentWithRetry(userOrId, paymentData) {
    const instance = new OrderProcessor();
    let lastError;
    let user = userOrId;

    // Resolución de usuario
    if (typeof userOrId === 'string') {
      try {
        user = await dbClient.getUser(userOrId);
      } catch (e) {
        throw new Error('User not found');
      }
    }

    // --- PIPELINE DE VALIDACIONES ---

    // 1. Integridad de Datos
    if (!paymentData.idempotencyKey || !paymentData.amount) {
      throw new Error('UNSAFE_TRANSACTION: Missing required integrity keys');
    }

    // 15. Formato de ID de Transacción (Source Integrity)
    const EXPECTED_PREFIX = 'TX_';
    if (!paymentData.idempotencyKey.startsWith(EXPECTED_PREFIX)) {
      throw new Error('INVALID_FORMAT: Transaction key must start with TX_.');
    }

    // 2. Estado de la Cuenta
    const allowedStatuses = ['active', 'verified'];
    if (!user.status || !allowedStatuses.includes(user.status)) {
      throw new Error(`ACCOUNT_INACTIVE: Current status: ${user.status || 'unknown'}`);
    }

    // 11. Profile Integrity (KYC)
    if (!user.email || !user.phoneVerified) {
      throw new Error('INCOMPLETE_PROFILE: Email and phone must be verified.');
    }

    // 3. Límites de Usuario (Daily/Monthly/Funds)
    await OrderProcessor.checkUserLimits(user, paymentData.amount);

    // 12. Real-Time Balance Safeguard (Debit only)
    if (user.accountType === 'debit' && user.balance < paymentData.amount) {
      throw new Error('INSUFFICIENT_FUNDS: Your account balance is too low.');
    }

    // 13. Minimum Transaction Threshold
    if (paymentData.amount < 1.00) {
      throw new Error('TRANSACTION_TOO_SMALL: Minimum amount is 1.00.');
    }

    // 4. Session Expiry (Security)
    const sessionTimeout = 15 * 60 * 1000;
    if (paymentData.metadata?.timestamp) {
      const timeElapsed = Date.now() - new Date(paymentData.metadata.timestamp).getTime();
      if (timeElapsed > sessionTimeout) {
        throw new Error('SESSION_EXPIRED: Request timed out.');
      }
    }

    // 10. IP Whitelist (Security)
    const userIps = await dbClient.getUserTrustedIPs(user.id);
    if (paymentData.metadata?.ipAddress && userIps.length > 0) {
      const isIpTrusted = userIps.some(ip => ip.address === paymentData.metadata.ipAddress && ip.isActive);
      if (!isIpTrusted) throw new Error('UNTRUSTED_IP: IP address not authorized.');
    }

    // 5. Risk Tier Enforcement
    if (paymentData.amount > 5000 && ['guest', 'regular', 'unverified'].includes(user.tier)) {
      throw new Error('RISK_LIMIT_REACHED: VIP account required for high-value orders.');
    }

    // 14. Regional Currency Clearing
    const clearingSupported = ['USD', 'EUR', 'ARS', 'BRL'];
    if (!clearingSupported.includes(paymentData.currency)) {
      throw new Error(`UNSUPPORTED_CURRENCY: ${paymentData.currency} is not allowed.`);
    }

    // 16. Device Fingerprint Validation (Identity Theft Protection)
    // Checks if the transaction comes from a registered device token
    const transactionDeviceId = paymentData.metadata?.deviceId;
    if (transactionDeviceId && user.deviceTokens && user.deviceTokens.length > 0) {
      const isKnownDevice = user.deviceTokens.includes(transactionDeviceId);
      if (!isKnownDevice) {
        // We don't block it (to allow new devices), but we flag it for the FraudDetector
        logger.warn(`Security Alert: Transaction from unknown device ${transactionDeviceId} for user ${user.id}`);
        paymentData.riskFactor = (paymentData.riskFactor || 0) + 0.4;
      }
    }

    // 17. Velocity Spike Detection (Anomalous Behavior)
    // Compares the current amount against the user's historical average
    const historicalAverage = user.totalSpent / (user.transactionCount || 1);
    const SPIKE_FACTOR = 5; // Alert if 5 times higher than average

    if (user.transactionCount > 5 && paymentData.amount > (historicalAverage * SPIKE_FACTOR)) {
      logger.warn(`Behavior Alert: Transaction amount spike detected for user ${user.id}. Amount: ${paymentData.amount}, Avg: ${historicalAverage.toFixed(2)}`);
      // Incrementamos el riesgo para que el FraudDetector sea más estricto
      paymentData.riskFactor = (paymentData.riskFactor || 0) + 0.5;
    }

    // 18. Session ID Integrity Check
    // Verifies that the request is bound to a valid session identifier
    if (!paymentData.metadata?.sessionId) {
      logger.error(`Security Alert: Transaction attempt without Session ID for user ${user.id}`);
      throw new Error('MISSING_SESSION_ID: Security context is incomplete.');
    }

    // 8. Currency Consistency
    if (user.accountCurrency && user.accountCurrency !== paymentData.currency) {
      throw new Error('CURRENCY_MISMATCH: Payment must match account currency.');
    }

    // 9. Boundary Validation
    if (paymentData.amount > 50000) {
      throw new Error('AMOUNT_OUT_OF_RANGE: Maximum limit is 50,000.');
    }

    // 6. Fraud Detection (IA Score)
    const fraudScore = await instance.fraudDetector.analyzeTransaction(user, paymentData);
    if (fraudScore > 0.8) {
      await instance.handleFraudulentTransaction(user, paymentData, fraudScore);
      throw new Error('FRAUD_DETECTION_ALARM');
    }

    // 7. Maintenance Window
    if (new Date().getHours() === 3) {
      throw new Error('SERVICE_UNAVAILABLE: System maintenance.');
    }

    // --- CICLO DE EJECUCIÓN CON REINTENTOS ---
    for (let attempt = 1; attempt <= instance.maxRetries; attempt++) {
      try {
        logger.info(`Payment attempt ${attempt}/${instance.maxRetries}`);
        return await paymentGateway.charge({
          userId: user.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          idempotencyKey: `${paymentData.idempotencyKey}-${attempt}`
        });
      } catch (error) {
        lastError = error;
        if (instance.isPermanentError(error)) throw error;
        if (attempt < instance.maxRetries) {
          await instance.sleep(instance.retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    throw new Error(`Payment failed: ${lastError.message}`);
  }

  isPermanentError(error) {
    const codes = ['card_declined', 'insufficient_funds', 'security_violation'];
    return codes.some(code => error.message.toLowerCase().includes(code));
  }

  async handleFraudulentTransaction(user, paymentData, fraudScore) {
    await dbClient.logFraudAttempt({ userId: user.id, fraudScore });
    if (fraudScore > 0.95) await dbClient.updateUser(user.id, { status: 'suspended' });
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

module.exports = OrderProcessor;