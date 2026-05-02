// notificationService.js - Mock Notification Service

class NotificationService {
  async sendEmail({ to, subject, template, data }) {
    console.log(`[Email] Sent to: ${to} | Subject: ${subject}`);
    return Promise.resolve({ success: true, messageId: 'email-' + Date.now() });
  }

  async sendSMS({ to, message }) {
    console.log(`[SMS] Sent to: ${to} | Message: ${message}`);
    return Promise.resolve({ success: true, sid: 'sms-' + Date.now() });
  }

  async sendPush({ tokens, title, body, data }) {
    console.log(`[Push] Sent to ${tokens.length} devices | Title: ${title}`);
    return Promise.resolve({ success: true, multicastId: 'push-' + Date.now() });
  }
}

module.exports = new NotificationService();