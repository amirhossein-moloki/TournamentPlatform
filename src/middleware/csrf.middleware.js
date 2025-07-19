const { csrfSync } = require('csrf-sync');

const { csrfSynchronisedProtection } = csrfSync({
  secret: process.env.CSRF_SECRET,
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
});

module.exports = {
  csrfSynchronisedProtection
};