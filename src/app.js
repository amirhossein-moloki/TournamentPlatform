const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ApiError = require('./utils/ApiError');
const { errorHandler } = require('./middleware/error.middleware');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const xss = require('./middleware/xss.middleware.js');
const csrfMiddleware = require('./middleware/csrf.middleware');
// --- تغییر اصلی اینجا است ---
// ما آبجکتی که از csrf.middleware.js اکسپورت شده (یعنی csrfProtection) را ایمپورت می‌کنیم
// و نام آن را به 'csrfMiddleware' تغییر دادیم تا با نام 'csrfSync' از کتابخانه اصلی اشتباه نشود.
// --- پایان تغییر اصلی ---

const app = express();

let swaggerDocument;
try {
    const swaggerJsonPath = path.join(__dirname, '../docs/swagger-generated.json');
    const swaggerJsonContent = fs.readFileSync(swaggerJsonPath, 'utf8');
    swaggerDocument = JSON.parse(swaggerJsonContent);
} catch (error) {
    console.error("Failed to load or parse swagger-generated.json:", error);
    swaggerDocument = { openapi: '3.0.0', info: { title: 'API Docs Not Available', version: '0.0.0' }, paths: {} };
}

// Set security HTTP headers
app.use(helmet());

// Middlewares
// In production, you should strictly specify the allowed origins.
// Using '*' is convenient for development but insecure for production.
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({ limit: process.env.REQUEST_LIMIT || '16kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '16kb' }));
app.use(cookieParser()); // Cookie parser should be used before CSRF middleware

app.use(xss); // Your custom XSS protection middleware

// --- استفاده صحیح از میان‌افزارهای CSRF ---
// حالا از خصوصیات tokenProviderMiddleware و csrfSynchronizerMiddleware از آبجکت ایمپورت شده استفاده می‌کنیم.
app.use(csrfMiddleware);
// --- پایان استفاده صحیح ---

app.use(express.static('public'));

// Rate limiting to prevent brute-force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);


if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy and running!' });
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// If no route handles the request, return a 404 error
app.use((req, res, next) => {
    next(new ApiError(404, 'Not Found - The requested resource does not exist on this server.'));
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;