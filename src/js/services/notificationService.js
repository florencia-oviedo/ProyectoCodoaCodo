// notificationService.js - Servicio de notificaciones ficticio para testing

class NotificationService {
  async sendEmail(emailData) {
    // Simular envío de email
    console.log(`Email sent to ${emailData.to}: ${emailData.subject}`);
    return { success: true, messageId: 'MSG-' + Date.now() };
  }

  async sendPush(pushData) {
    // Simular envío de push notification
    console.log(`Push sent to ${pushData.tokens.length} devices: ${pushData.title}`);
    return { success: true, messageId: 'PUSH-' + Date.now() };
  }

  async sendSMS(smsData) {
    // Simular envío de SMS
    console.log(`SMS sent to ${smsData.to}: ${smsData.message}`);
    return { success: true, messageId: 'SMS-' + Date.now() };
  }
}

module.exports = new NotificationService();