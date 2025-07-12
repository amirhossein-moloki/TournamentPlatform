const httpStatusCodes = require('http-status-codes');
const { appConfig } = require('../../config/config');

class AuthController {
  constructor(useCases) {
    this.useCases = useCases;
  }

  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      const { user, accessToken, refreshToken } = await this.useCases.registerUser.execute(username, email, password);

      res.cookie('jid', refreshToken, {
        httpOnly: true,
        secure: appConfig.env === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });

      res.status(httpStatusCodes.CREATED).json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await this.useCases.login.execute(email, password);

      res.cookie('jid', refreshToken, {
        httpOnly: true,
        secure: appConfig.env === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });

      res.status(httpStatusCodes.OK).json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies.jid;
      const { accessToken } = await this.useCases.refreshToken.execute(refreshToken);
      res.status(httpStatusCodes.OK).json({ accessToken });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies.jid;
      await this.useCases.logout.execute(refreshToken);
      res.clearCookie('jid', { path: '/api/v1/auth' });
      res.status(httpStatusCodes.OK).json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async requestVerificationEmail(req, res, next) {
    try {
      const { id } = req.user;
      await this.useCases.sendVerificationEmail.execute(id);
      res.status(httpStatusCodes.OK).json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      await this.useCases.verifyEmail.execute(token);
      res.status(httpStatusCodes.OK).json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
