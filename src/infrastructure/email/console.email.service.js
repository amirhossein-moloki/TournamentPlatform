const EmailServiceInterface = require('../../application/services/email.service.interface');
const logger = require('../../utils/logger');

/**
 * @implements {EmailServiceInterface}
 * A mock email service that logs email content to the console instead of sending actual emails.
 * Useful for development and testing environments.
 */
class ConsoleEmailService extends EmailServiceInterface {
  /**
   * Logs the email details to the console.
   * @param {string} to - The recipient's email address.
   * @param {string} subject - The subject of the email.
   * @param {string} textBody - The plain text body of the email.
   * @param {string} [htmlBody] - Optional HTML body of the email.
   * @returns {Promise<void>} Resolves immediately.
   */
  async sendEmail(to, subject, textBody, htmlBody) {
    logger.info('--- Sending Email (Console Output) ---');
    logger.info(`To: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info('--- Text Body ---');
    logger.info(textBody);
    if (htmlBody) {
      logger.info('--- HTML Body ---');
      logger.info(htmlBody);
    }
    logger.info('--- Email Sent (Console Output) ---');
    return Promise.resolve();
  }

  // The specific methods like sendVerificationEmail and sendPasswordResetEmail
  // are inherited from EmailServiceInterface and will use the overridden sendEmail method above.
}

module.exports = ConsoleEmailService;
// To use this service in development:
// 1. Instantiate it: `const emailService = new ConsoleEmailService();`
// 2. Inject it into use cases that require an email service.
//
// For production, you would create a different implementation (e.g., `SESEmailService.js`)
// and instantiate that instead, typically chosen based on environment configuration.
// This ConsoleEmailService is perfect for ensuring the email sending flow works
// without configuring actual email credentials or incurring costs during development.
