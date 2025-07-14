const { csrfSync } = require('csrf-sync');

const csrfProtection = csrfSync({
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
});

module.exports = csrfProtection;
