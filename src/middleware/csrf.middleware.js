const { csrfSync } = require('csrf-sync');

const { csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
});

module.exports = {
  csrfSynchronisedProtection
};