# Tournament Platform

A comprehensive, secure, and scalable tournament platform built with Node.js, Express, PostgreSQL, Redis, RabbitMQ, and Socket.io. This platform supports user registration, wallet management, tournament creation and participation, real-time match updates, and secure result reporting.

## Table of Contents

- [Features](#features)
- [Architectural Principles](#architectural-principles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Scripts](#scripts)
- [CI/CD](#cicd)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Secure Registration and Authentication**: JWT-based (Access & Refresh Tokens in HttpOnly cookies).
- **Wallet System**: Top-up with idempotency, transaction history, secure withdrawal requests.
- **Tournament Management**: List, view details, register for tournaments.
- **Team Formation & Coordination**: (Conceptual - basic structure for rooms).
- **Real-time Match Updates**: Live chat, bracket updates via Socket.io.
- **Secure Result Reporting**: Signed URLs for screenshot uploads, asynchronous malware scanning.
- **Dispute Resolution**: Admin panel for moderators.
- **Prize Payouts**: Asynchronous processing via message queue.
- **Leaderboards**: Served from a read-optimized database (e.g., Redis).
- **Admin Panel**: Role-based access for managing disputes and withdrawals.

## Architectural Principles

- **Event-Driven Choreography**: Decoupled services using a Message Bus (RabbitMQ).
- **Clean Architecture**: Separation of Domain, Application, and Infrastructure layers.
- **Secure by Design**: Security integrated at all stages of development.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (with Sequelize ORM)
- **Caching**: Redis
- **Message Queue**: RabbitMQ (amqplib)
- **WebSockets**: Socket.io
- **Authentication**: JSON Web Tokens (jsonwebtoken), bcryptjs
- **Validation**: Joi
- **Logging**: Winston
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest, Supertest
- **Linters/Formatters**: ESLint, Prettier

## Project Structure

The project follows a Clean Architecture pattern:

```
/tournament-platform
├── config/         # Environment and application configurations
├── db/             # Database migrations and seeders
├── docs/           # API documentation (e.g., OpenAPI specs)
├── src/
│   ├── application/  # Use cases, application-specific logic
│   ├── domain/       # Core business logic, entities, repository interfaces
│   ├── infrastructure/ # Database connectors, external service adapters (cache, messaging)
│   ├── presentation/   # API routes, WebSocket handlers, webhook controllers
│   ├── middleware/   # Express middleware (auth, error handling, RBAC)
│   ├── workers/      # Background job processors (RabbitMQ consumers)
│   ├── utils/        # Shared utilities (logger, API response/error classes)
│   └── app.js        # Express application setup
├── tests/          # Unit, integration, e2e, contract, performance tests
├── .github/        # GitHub Actions workflows
├── .dockerignore
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── jsconfig.json
├── package.json
└── server.js       # Main application entry point
```

## Prerequisites

- [Node.js](https://nodejs.org/) (version specified in `package.json` engines)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) (for containerized setup)
- [PostgreSQL](https://www.postgresql.org/download/) (if running locally without Docker)
- [Redis](https://redis.io/download) (if running locally without Docker)
- [RabbitMQ](https://www.rabbitmq.com/download.html) (if running locally without Docker)

## Getting Started

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd tournament-platform
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

### Environment Configuration

1.  **Create a `.env` file** by copying the example:
    ```bash
    cp .env.example .env
    ```
2.  **Update the `.env` file** with your specific configurations for:
    - Application (PORT, API_BASE_URL)
    - Database (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
    - JWT (JWT_SECRET, token expirations)
    - Redis (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
    - RabbitMQ (RABBITMQ_URL, queue names)
    - Payment Gateway (API_KEY, WEBHOOK_SECRET) - Note: This might be for a generic gateway.
    - **Zarinpal Payment Gateway**:
        - `ZARINPAL_MERCHANT_ID`: Your Zarinpal merchant ID.
        - `ZARINPAL_ACCESS_TOKEN` (Optional): Your Zarinpal access token, if using features like refunds.
    - AWS S3 (ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, BUCKET_NAME)
    - Logging (LOG_LEVEL, file paths)
    - Admin User Seeder (ADMIN_EMAIL, ADMIN_PASSWORD)

### Database Setup

**Using Docker (Recommended):**
The `docker-compose up` command will automatically set up PostgreSQL, Redis, and RabbitMQ services.

**Running Locally (without Docker):**
Ensure you have PostgreSQL, Redis, and RabbitMQ instances running and configured in your `.env` file.

**Migrations and Seeding:**
Once the database service is running (either via Docker or locally and configured):

1.  **Run database migrations:**
    ```bash
    npm run db:migrate
    ```
2.  **Run database seeders (e.g., to create an admin user):**
    ```bash
    npm run db:seed
    ```

### Running the Application

**Using Docker (Recommended):**

1.  **Build and start containers:**
    ```bash
    npm run docker:build # (if not already built or changes were made to Dockerfile)
    npm run docker:run
    ```
    The application will be accessible at `http://localhost:<PORT>` (e.g., `http://localhost:3000`).

2.  **View logs:**
    ```bash
    npm run docker:logs
    ```

3.  **Stop containers:**
    ```bash
    npm run docker:stop
    ```

**Running Locally (without Docker):**

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  **Start the production server:**
    ```bash
    npm start
    ```
    The application will be accessible at `http://localhost:<PORT>`.

## API Endpoints

The API is documented using the OpenAPI 3.x.x specification. The definition file is located at `docs/swagger-generated.json`.

When the application is running, an interactive Swagger UI is available at the `/api-docs` endpoint (e.g., `http://localhost:3000/api-docs`). This UI allows you to explore the API, view endpoint details, and test them directly in your browser.

The `server.js` file is configured to load `docs/swagger-generated.json` and serve it using `swagger-ui-express`.

Key endpoint categories include:

- **Authentication**: `/api/v1/auth/register`, `/api/v1/auth/login`, etc.
- **Wallet**: `/api/v1/wallet/deposit/initialize`, `/api/webhooks/payment-gateway`, etc.
- **Tournaments**: `/api/v1/tournaments`, `/api/v1/tournaments/:id/register`, etc.
- **Matches**: `/api/v1/matches/:id/results/upload-url`, `/api/v1/matches/:id/results`, etc.
- **Admin**: `/api/v1/admin/disputes`, `/api/v1/admin/withdrawals`, etc.

## WebSocket Events

Secure WebSocket communication is handled via Socket.io. Key events include:

| Direction          | Event Name     | Description                                                                                              |
| :----------------- | :------------- | :------------------------------------------------------------------------------------------------------- |
| **Connection**     | `connection`   | Authenticates with Access Token during handshake.                                                        |
| **Client -> Server** | `joinRoom`     | Request to join a specific chat room (server verifies permission).                                       |
| **Client -> Server** | `sendMessage`  | Send a message (rate-limited).                                                                           |
| **Server -> Client** | `newMessage`   | Broadcasts sanitized message to room participants.                                                       |
| **Server -> Client** | `notification` | Sends a personal notification to a user.                                                                 |
| **Server -> Client** | `bracketUpdate`| Sends live tournament bracket updates.                                                                   |

## Scripts

- `npm start`: Starts the application in production mode.
- `npm run dev`: Starts the application in development mode with Nodemon.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run format`: Formats code using Prettier.
- `npm test`: Runs all tests (unit, integration, etc.) with Jest.
- `npm run test:unit`, `npm run test:integration`, etc.: Runs specific types of tests.
- `npm run db:migrate`: Applies database migrations.
- `npm run db:seed`: Seeds the database.
- `npm run docker:build`: Builds the Docker image.
- `npm run docker:run`: Starts services using Docker Compose.
- `npm run docker:stop`: Stops services using Docker Compose.
- `npm run docker:logs`: Tails logs from the application container.

## Testing

The project uses [Jest](https://jestjs.io/) as its testing framework. Tests are categorized into unit, integration, and potentially other types (E2E, contract, performance).

**Running Tests:**

*   **Run all tests (unit, integration, etc.) and generate coverage report:**
    ```bash
    npm test
    ```
*   **Run only unit tests:**
    ```bash
    npm run test:unit
    ```
    Unit tests are typically located in `tests/unit/` and focus on individual modules or functions in isolation, with dependencies mocked.
*   **Run only integration tests:**
    ```bash
    npm run test:integration
    ```
    Integration tests are located in `tests/integration/` and test the interaction between different components, such as API endpoints or services with database layers. These tests may require a running test database (as configured in `.env.test`).
*   **Run a specific test file or suite:**
    You can pass a path or pattern to Jest via the npm scripts:
    ```bash
    # Example: Run all tests in a specific directory
    npm test -- tests/unit/domain/
    # Example: Run a single test file
    npm test -- tests/integration/auth.routes.test.js
    # Example: Run tests matching a specific name (using Jest's -t flag)
    npm test -- -t "should register a user"
    ```
    Note the `--` before passing Jest-specific arguments when using `npm test`. For specific scripts like `npm run test:unit`, you can often append the path directly:
    ```bash
    npm run test:unit tests/unit/domain/user/user.entity.test.js
    ```

**Test Environment:**

*   Ensure you have a `.env.test` file configured, especially for database connection details for integration tests. This file is typically copied from `.env.example` and customized.
*   The `NODE_ENV=test` is automatically set by the test scripts, which may alter application behavior (e.g., logging levels, database used).

**Coverage:**

*   The `npm test` command automatically generates a coverage report in the `coverage/` directory. You can open `coverage/lcov-report/index.html` in a browser to view detailed coverage statistics.

## CI/CD

The project uses GitHub Actions for Continuous Integration and Continuous Deployment. The workflow (`.github/workflows/ci-cd.yml`) includes:
- Linting and testing on pushes/pull requests to `main` and `develop`.
- Building and pushing Docker images to a container registry on pushes to `main` and `develop`.
- Automated deployment to a staging environment from the `develop` branch.
- Manual approval for deployment to the production environment from the `main` branch.

## Security Considerations

- **Authentication**: JWTs with short-lived access tokens and HttpOnly refresh tokens.
- **Authorization**: Role-Based Access Control (RBAC) middleware.
- **Input Validation**: Joi for request body, params, and query validation.
- **SQL Injection Prevention**: Sequelize ORM handles query sanitization.
- **XSS Prevention**: Contextual output encoding (though primarily an API, be mindful if serving HTML).
- **CSRF Protection**: Not typically an issue for stateless APIs using tokens in headers/body, but ensure no session-based auth is mixed. Refresh token cookies should be `SameSite=Strict` or `Lax`.
- **Secure Headers**: `helmet` middleware is used.
- **Rate Limiting**: Applied to sensitive endpoints.
- **Secure File Uploads**: Pre-signed URLs for direct client-to-S3 uploads. Asynchronous malware scanning.
- **Webhook Security**: Digital signature verification for incoming webhooks.
- **Secret Management**: All secrets loaded from environment variables (via `.env` in development, platform-provided in production).
- **Logging**: Comprehensive logging with sensitive data masking/anonymization.
- **Dependency Management**: Regularly update dependencies and audit for vulnerabilities.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes.
4. Ensure tests pass (`npm test`).
5. Commit your changes (`git commit -m 'Add some feature'`).
6. Push to the branch (`git push origin feature/your-feature-name`).
7. Open a Pull Request.

Please ensure your code adheres to the project's linting and formatting standards.

## License

This project is licensed under the ISC License. See the `LICENSE` file (if one exists, or specify here if not creating a separate file) for details.

---

*This README provides a general overview. Specific implementation details can be found within the codebase and related documentation (`docs/openapi.yml`).*
