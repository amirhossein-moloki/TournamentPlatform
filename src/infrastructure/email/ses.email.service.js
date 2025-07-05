// src/infrastructure/email/ses.email.service.js
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const EmailServiceInterface = require('../../application/services/email.service.interface');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class SesEmailService extends EmailServiceInterface {
  /**
   * @param {object} appConfig - Application configuration.
   * @param {object} logger - Logger instance.
   */
  constructor(appConfig, logger) {
    super();
    this.config = appConfig.aws; // AWS specific config
    this.emailConfig = appConfig.email; // Email specific config (sender address)
    this.logger = logger;

    if (!this.config || !this.config.region || !this.config.accessKeyId || !this.config.secretAccessKey) {
      this.logger.warn('AWS SES configuration is incomplete. SESEmailService may not function.');
      // Depending on strictness, could throw an error here if provider is SES
      if (this.emailConfig.provider === 'SES') {
        throw new Error('AWS SES provider selected, but AWS config (region, accessKeyId, secretAccessKey) is missing or incomplete.');
      }
      this.sesClient = null;
    } else {
      this.sesClient = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
    }
    this.templatesDir = path.join(__dirname, 'templates'); // e.g., src/infrastructure/email/templates/
  }

  /**
   * Loads and compiles an email template.
   * @param {string} templateName - The name of the template file (without .hbs extension).
   * @param {object} data - Data to pass to the template.
   * @returns {Promise<string>} The rendered HTML content.
   * @private
   */
  async _renderTemplate(templateName, data) {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    try {
      const templateSource = await fs.promises.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateSource);
      return compiledTemplate(data);
    } catch (error) {
      this.logger.error(`Error rendering email template ${templateName}: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Could not render email template: ${templateName}`);
    }
  }

  async sendEmail(to, subject, textBody, htmlBody) {
    if (this.emailConfig.provider !== 'SES' || !this.sesClient) {
      this.logger.warn(`SESEmailService.sendEmail called but provider is not SES or client not configured. Email to ${to} with subject "${subject}" not sent via SES.`);
      // Fallback to console or do nothing, or throw error depending on desired strictness
      // For now, let's just log and not send if not configured for SES.
      // In a real setup, the factory should prevent this service from being used if not configured.
      console.log(`---- CONSOLE EMAIL (SES not configured) ----
To: ${to}
Subject: ${subject}
Text: ${textBody}
HTML: ${htmlBody ? 'Yes (see below)' : 'No'}
${htmlBody || ''}
---------------------------------------`);
      return;
    }

    if (!this.emailConfig.senderAddress) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Email sender address is not configured for SES.');
    }

    const params = {
      Source: this.emailConfig.senderAddress,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    };

    if (htmlBody) {
      params.Message.Body.Html = {
        Data: htmlBody,
        Charset: 'UTF-8',
      };
    }

    try {
      const command = new SendEmailCommand(params);
      const data = await this.sesClient.send(command);
      this.logger.info(`Email sent successfully to ${to} via SES. MessageId: ${data.MessageId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to} via SES: ${error.message}`, { error, params });
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `SES email sending failed: ${error.message}`);
    }
  }

  async sendVerificationEmail(emailAddress, username, verificationToken, verificationUrlBase) {
    const verificationLink = `${verificationUrlBase}/${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const templateData = {
      username,
      verificationLink,
      appName: this.config.appName || 'Our Platform', // Assuming appName is in appConfig
    };

    try {
      const htmlBody = await this._renderTemplate('userVerification', templateData);
      // Generate a simple text body from HTML or from template data
      const textBody = `Hello ${username},\nPlease verify your email by visiting: ${verificationLink}\nThanks, The ${templateData.appName} Team.`;
      return this.sendEmail(emailAddress, subject, textBody, htmlBody);
    } catch (error) {
      this.logger.error(`Failed to prepare verification email for ${emailAddress}: ${error.message}`, error);
      // Re-throw or handle as appropriate for the calling use case
      throw error;
    }
  }

  async sendPasswordResetEmail(emailAddress, username, resetToken, resetUrlBase) {
    const resetLink = `${resetUrlBase}/${resetToken}`;
    const subject = 'Password Reset Request';
    const templateData = {
      username,
      resetLink,
      appName: this.config.appName || 'Our Platform',
      // expirationTime: '1 hour', // This should be handled by token logic
    };

    try {
      const htmlBody = await this._renderTemplate('passwordReset', templateData);
      const textBody = `Hello ${username},\nTo reset your password, please visit: ${resetLink}\nThis link will expire based on our security policy.\nThanks, The ${templateData.appName} Team.`;
      return this.sendEmail(emailAddress, subject, textBody, htmlBody);
    } catch (error) {
      this.logger.error(`Failed to prepare password reset email for ${emailAddress}: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = SesEmailService;
