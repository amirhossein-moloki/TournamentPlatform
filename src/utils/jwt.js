const jwt = require('jsonwebtoken');
const { appConfig } = require('../../config/config');

const generateToken = (payload) => {
    return jwt.sign(payload, appConfig.jwt.secret, { expiresIn: appConfig.jwt.accessExpiration });
};

module.exports = {
    generateToken,
};
