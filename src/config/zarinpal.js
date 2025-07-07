const { ZarinPal } = require('zarinpal-node-sdk');
const { appConfig } = require('../../config/config'); // Corrected path

const zarinpalInstance = new ZarinPal({
  merchantId: appConfig.zarinpal.merchantId || 'YOUR_MERCHANT_ID_IF_NOT_SET_IN_ENV', // Fallback for safety, but ENV should be used
  sandbox: appConfig.env !== 'production', // Use appConfig.env which is already validated
  accessToken: appConfig.zarinpal.accessToken, // Will be undefined if not set, which is fine for ZarinPal constructor
});

module.exports = zarinpalInstance;
