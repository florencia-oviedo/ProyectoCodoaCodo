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
    const todayTransactions = await dbClient.getUserTransactionsToday(user.id);[cite: 2]
    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);[cite: 2]

    if (todayTotal + amount > user.dailyLimit) {
      throw new Error('Daily transaction limit exceeded');[cite: 2]
    }

    const monthTransactions = await dbClient.getUserTransactionsThisMonth(user.id);[cite: 2]
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);[cite: 2]

    if (monthTotal + amount > user.monthlyLimit) {
      throw new Error('Monthly transaction limit exceeded');[cite: 2]
    }

    if (user.accountType === 'debit' && user.balance < amount) {
      throw new Error('Insufficient funds');[cite: 2]
    }
  }

  /**
   * Ejecución de pago con pipeline de 15 validaciones
   * Se define como estático para asegurar compatibilidad con el agente de pruebas
   */
  static async executePaymentWithRetry(userOrId, paymentData) {
    const instance = new OrderProcessor();[cite: 2]
    let lastError;
    let user = userOrId;

    // Resolución de usuario
    if (typeof userOrId === 'string') {
      try {
        user = await dbClient.getUser(userOrId);[cite: 2]
      } catch (e) {
        throw new Error('User not found');[cite: 2]
      }
    }

    // --- PIPELINE DE VALIDACIONES ---

    // 1. Integridad de Datos
    if (!paymentData.idempotencyKey || !paymentData.amount) {
      throw new Error('UNSAFE_TRANSACTION: Missing required integrity keys');[cite: 2]
    }

    // 15. Formato de ID de Transacción (Source Integrity)
    const EXPECTED_PREFIX = 'TX_';
    if (!paymentData.idempotencyKey.startsWith(EXPECTED_PREFIX)) {
      throw new Error('INVALID_FORMAT: Transaction key must start with TX_.');[cite: 2]
    }

    // 2. Estado de la Cuenta
    const allowedStatuses = ['active', 'verified'];[cite: 2]
    if (!user.status || !allowedStatuses.includes(user.status)) {
      throw new Error(`ACCOUNT_INACTIVE: Current status: ${user.status || 'unknown'}`);[cite: 2]
    }

    // 11. Profile Integrity (KYC)
    if (!user.email || !user.phoneVerified) {
      throw new Error('INCOMPLETE_PROFILE: Email and phone must be verified.');[cite: 2]
    }

    // 3. Límites de Usuario (Daily/Monthly/Funds)
    await OrderProcessor.checkUserLimits(user, paymentData.amount);[cite: 2]

    // 12. Real-Time Balance Safeguard (Debit only)
    if (user.accountType === 'debit' && user.balance < paymentData.amount) {
      throw new Error('INSUFFICIENT_FUNDS: Your account balance is too low.');[cite: 2]
    }

    // 13. Minimum Transaction Threshold
    if (paymentData.amount < 1.00) {
      throw new Error('TRANSACTION_TOO_SMALL: Minimum amount is 1.00.');[cite: 2]
    }

    // 4. Session Expiry (Security)
    const sessionTimeout = 15 * 60 * 1000;
    if (paymentData.metadata?.timestamp) {
      const timeElapsed = Date.now() - new Date(paymentData.metadata.timestamp).getTime();
      if (timeElapsed > sessionTimeout) {
        throw new Error('SESSION_EXPIRED: Request timed out.');[cite: 2]
      }
    }

    // 10. IP Whitelist (Security)
    const userIps = await dbClient.getUserTrustedIPs(user.id);[cite: 2]
    if (paymentData.metadata?.ipAddress && userIps.length > 0) {
      const isIpTrusted = userIps.some(ip => ip.address === paymentData.metadata.ipAddress && ip.isActive);
      if (!isIpTrusted) throw new Error('UNTRUSTED_IP: IP address not authorized.');[cite: 2]
    }

    // 5. Risk Tier Enforcement
    if (paymentData.amount > 5000 && ['guest', 'regular', 'unverified'].includes(user.tier)) {
      throw new Error('RISK_LIMIT_REACHED: VIP account required for high-value orders.');[cite: 2]
    }

    // 14. Regional Currency Clearing
    const clearingSupported = ['USD', 'EUR', 'ARS', 'BRL'];[cite: 2]
    if (!clearingSupported.includes(paymentData.currency)) {
      throw new Error(`UNSUPPORTED_CURRENCY: ${paymentData.currency} is not allowed.`);[cite: 2]
    }

    // 8. Currency Consistency
    if (user.accountCurrency && user.accountCurrency !== paymentData.currency) {
      throw new Error('CURRENCY_MISMATCH: Payment must match account currency.');[cite: 2]
    }

    // 9. Boundary Validation
    if (paymentData.amount > 50000) {
      throw new Error('AMOUNT_OUT_OF_RANGE: Maximum limit is 50,000.');[cite: 2]
    }

    // 6. Fraud Detection (IA Score)
    const fraudScore = await instance.fraudDetector.analyzeTransaction(user, paymentData);[cite: 2]
    if (fraudScore > 0.8) {
      await instance.handleFraudulentTransaction(user, paymentData, fraudScore);[cite: 2]
      throw new Error('FRAUD_DETECTION_ALARM');[cite: 2]
    }

    // 7. Maintenance Window
    if (new Date().getHours() === 3) {
      throw new Error('SERVICE_UNAVAILABLE: System maintenance.');[cite: 2]
    }

    // --- CICLO DE EJECUCIÓN CON REINTENTOS ---
    for (let attempt = 1; attempt <= instance.maxRetries; attempt++) {
      try {
        logger.info(`Payment attempt ${attempt}/${instance.maxRetries}`);[cite: 2]
        return await paymentGateway.charge({
          userId: user.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          idempotencyKey: `${paymentData.idempotencyKey}-${attempt}`
        });[cite: 2]
      } catch (error) {
        lastError = error;
        if (instance.isPermanentError(error)) throw error;[cite: 2]
        if (attempt < instance.maxRetries) {
          await instance.sleep(instance.retryDelay * Math.pow(2, attempt - 1));[cite: 2]
        }
      }
    }

    throw new Error(`Payment failed: ${lastError.message}`);[cite: 2]
  }

  isPermanentError(error) {
    const codes = ['card_declined', 'insufficient_funds', 'security_violation'];[cite: 2]
    return codes.some(code => error.message.toLowerCase().includes(code));[cite: 2]
  }

  async handleFraudulentTransaction(user, paymentData, fraudScore) {
    await dbClient.logFraudAttempt({ userId: user.id, fraudScore });[cite: 2]
    if (fraudScore > 0.95) await dbClient.updateUser(user.id, { status: 'suspended' });[cite: 2]
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }[cite: 2]
}

module.exports = OrderProcessor;