// fraudDetector.js - Mock Fraud Detection Service for Testing

class FraudDetector {
  /**
   * Analyze transaction for potential fraud
   * Returns a score between 0 and 1 (High score = high fraud probability)
   */
  async analyzeTransaction(user, paymentData) {
    let score = 0.1; // Base low score

    // Increase score based on transaction amount
    if (paymentData.amount > 10000) {
      score += 0.3;
    }

    // Decrease score for established users with transaction history
    if (user.transactionCount && user.transactionCount > 10) {
      score -= 0.1;
    }

    // Simulate risk factor for specific payment methods (e.g., crypto)
    if (paymentData.paymentMethod === 'crypto') {
      score += 0.2;
    }

    // Add some random variation for simulation purposes
    score += Math.random() * 0.4;

    // Ensure score is capped at 1.0
    return Math.min(1, score);
  }
}

// Export the class so PaymentProcessor can instantiate it
module.exports = FraudDetector;