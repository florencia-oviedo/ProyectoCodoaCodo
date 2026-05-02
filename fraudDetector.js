// fraudDetector.js - Detector de fraude ficticio para testing

class FraudDetector {
  async analyzeTransaction(transactionData) {
    // Simular análisis de fraude
    // Retornar score entre 0 y 1
    // Alto score = alta probabilidad de fraude

    let score = 0.1; // Base score bajo

    // Aumentar score basado en factores
    if (transactionData.amount > 10000) {
      score += 0.3;
    }

    if (transactionData.userHistory && transactionData.userHistory.length > 10) {
      score -= 0.1; // Usuarios con historial tienen score más bajo
    }

    // Simular score aleatorio
    score += Math.random() * 0.5;

    return Math.min(1, score);
  }
}

module.exports = new FraudDetector();