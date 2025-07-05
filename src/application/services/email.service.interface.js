/**
 * @interface EmailServiceInterface
 * Defines the contract for sending emails.
 * Implementations will handle the actual email sending logic via specific providers (SMTP, SendGrid, SES, etc.).
 */
class EmailServiceInterface {
  /**
   * Sends an email.
   * @param {string} to - The recipient's email address.
   * @param {string} subject - The subject of the email.
   * @param {string} textBody - The plain text body of the email.
   * @param {string} [htmlBody] - Optional HTML body of the email.
   * @returns {Promise<void>} Resolves if email is sent successfully, otherwise rejects.
   * @throws {Error} If email sending fails.
   */
  async sendEmail(to, subject, textBody, htmlBody) {
    throw new Error('Method "sendEmail" not implemented.');
  }

  /**
   * Sends an email verification email to the user.
   * @param {string} emailAddress - The user's email address.
   * @param {string} username - The user's username (for personalization).
   * @param {string} verificationToken - The unique token for email verification.
   * @param {string} verificationUrlBase - The base URL for the verification link (e.g., "https://yourapp.com/auth/verify-email").
   * @returns {Promise<void>}
   */
  async sendVerificationEmail(emailAddress, username, verificationToken, verificationUrlBase) {
    const verificationLink = `${verificationUrlBase}/${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const textBody = `Hello ${username},\n\nPlease verify your email address by clicking the following link: ${verificationLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe Tournament Platform Team`;
    const htmlBody = `<p>Hello ${username},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verificationLink}">Verify Email</a></p><p>If you did not request this, please ignore this email.</p><p>Thanks,<br/>The Tournament Platform Team</p>`;

    // This default implementation calls the generic sendEmail method.
    // Specific implementations might have more direct ways to use templates.
    return this.sendEmail(emailAddress, subject, textBody, htmlBody);
  }

  /**
   * Sends a password reset email to the user.
   * @param {string} emailAddress - The user's email address.
   * @param {string} username - The user's username.
   * @param {string} resetToken - The unique token for password reset.
   * @param {string} resetUrlBase - The base URL for the password reset link.
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(emailAddress, username, resetToken, resetUrlBase) {
    const resetLink = `${resetUrlBase}/${resetToken}`; // Example: https://app.com/reset-password/TOKEN
    const subject = 'Password Reset Request';
    const textBody = `Hello ${username},\n\nYou requested a password reset. Click the link to reset your password: ${resetLink}\n\nIf you did not request a password reset, please ignore this email.\nThis link will expire in 1 hour.\n\nThanks,\nThe Tournament Platform Team`;
    const htmlBody = `<p>Hello ${username},</p><p>You requested a password reset. Click the link to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>If you did not request a password reset, please ignore this email.<br/>This link will expire in 1 hour (this duration needs to be handled by the token generation/validation logic).</p><p>Thanks,<br/>The Tournament Platform Team</p>`;

    return this.sendEmail(emailAddress, subject, textBody, htmlBody);
  }
}

module.exports = EmailServiceInterface;
// Note: This interface includes a generic `sendEmail` method and specific helper methods
// like `sendVerificationEmail` and `sendPasswordResetEmail` that use `sendEmail`.
// Implementations of this interface (e.g., SMTPEmailService, SendGridEmailService)
// will provide the concrete logic for `sendEmail`.
// The `verificationUrlBase` and `resetUrlBase` would typically come from application configuration.
