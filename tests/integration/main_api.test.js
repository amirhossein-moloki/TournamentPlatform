const request = require('supertest');
const app = require('../../src/app'); // Main Express app
const db = require('../../src/infrastructure/database/models'); // Sequelize models

// Helper function to clear all data from tables
async function clearDatabase() {
  const models = Object.values(db.sequelize.models);
  for (const model of models) {
    await model.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  }
}

// Global beforeAll and afterAll hooks
beforeAll(async () => {
  // Ensure DB connection and sync (if needed, though usually handled by app start)
  // await db.sequelize.sync({ force: true }); // Example: if you want to reset DB structure
});

afterAll(async () => {
  await db.sequelize.close(); // Close DB connection
});

// Hook to clear database before each test suite (or each test if preferred)
beforeEach(async () => {
  await clearDatabase();
});

describe('API Health and Basic Routes', () => {
  test('GET / should return server health message', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Server is healthy and running!',
    });
  });

  test('GET /ping should return pong', async () => {
    const response = await request(app).get('/ping');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('pong');
  });

  test('GET /api/v1/nonexistent should return 404', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toContain('Not Found');
  });
});

describe('Authentication API (/api/v1/auth)', () => {
  const registerUrl = '/api/v1/auth/register';
  const loginUrl = '/api/v1/auth/login';
  const refreshUrl = '/api/v1/auth/refresh';
  const logoutUrl = '/api/v1/auth/logout';
  const requestVerificationEmailUrl = '/api/v1/auth/request-verification-email';
  const verifyEmailUrl = '/api/v1/auth/verify-email';

  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };
  let accessToken = '';
  let refreshTokenCookie = ''; // To store the actual cookie string

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send(testUser);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toContain('User registered and logged in successfully');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email); // Assuming email is returned, adjust if not
      expect(response.body.accessToken).toBeDefined();

      // Check for refresh token cookie (jid by default)
      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      const jidCookie = cookieHeader.find(cookie => cookie.startsWith('jid='));
      expect(jidCookie).toBeDefined();
      expect(jidCookie).toContain('HttpOnly');
      expect(jidCookie).toContain('Path=/api/v1/auth');
    });

    it('should fail to register if username is missing', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({ email: testUser.email, password: testUser.password });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Validation Error');
      expect(response.body.errors).toEqual(expect.arrayContaining(['"username" is required']));
    });

    it('should fail to register if email is invalid', async () => {
        const response = await request(app)
          .post(registerUrl)
          .send({ ...testUser, email: 'invalidemail' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Validation Error');
        expect(response.body.errors).toEqual(expect.arrayContaining(['"email" must be a valid email']));
    });

    it('should fail to register if user already exists (same email)', async () => {
      // First registration
      await request(app).post(registerUrl).send(testUser);
      // Second attempt
      const response = await request(app)
        .post(registerUrl)
        .send(testUser);
      expect(response.statusCode).toBe(400); // Or 409 Conflict, depending on implementation
      expect(response.body.message).toContain('User with this email already exists'); // Adjust based on actual error message
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      await clearDatabase(); // Clear before each login test too
      // Register user first
      await request(app).post(registerUrl).send(testUser);
    });

    it('should login an existing user successfully', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send({ email: testUser.email, password: testUser.password });
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.accessToken).toBeDefined();
      accessToken = response.body.accessToken; // Save for other tests

      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      const jidCookie = cookieHeader.find(cookie => cookie.startsWith('jid='));
      expect(jidCookie).toBeDefined();
      refreshTokenCookie = jidCookie; // Save the full cookie string
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send({ email: testUser.email, password: 'wrongpassword' });
      expect(response.statusCode).toBe(401); // Unauthorized
      expect(response.body.message).toContain('Invalid email or password'); // Or similar
    });

    it('should fail to login with non-existent email', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send({ email: 'nonexistent@example.com', password: testUser.password });
      expect(response.statusCode).toBe(401); // Unauthorized
      expect(response.body.message).toContain('Invalid email or password'); // Or similar
    });
  });

  describe('POST /refresh', () => {
    beforeEach(async () => {
      await clearDatabase();
      await request(app).post(registerUrl).send(testUser);
      const loginResponse = await request(app)
        .post(loginUrl)
        .send({ email: testUser.email, password: testUser.password });
      accessToken = loginResponse.body.accessToken;
      refreshTokenCookie = loginResponse.headers['set-cookie'].find(cookie => cookie.startsWith('jid='));
    });

    it('should refresh access token successfully with valid refresh token cookie', async () => {
      // refreshTokenCookie should be automatically sent by supertest if set correctly
      const response = await request(app)
        .post(refreshUrl)
        .set('Cookie', refreshTokenCookie); // Manually set cookie for test

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('Access token refreshed successfully');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(accessToken); // Should be a new token

      // Optionally check if a new refresh token was issued (if rotation is enabled)
      const newCookieHeader = response.headers['set-cookie'];
      if (newCookieHeader) {
        const newJidCookie = newCookieHeader.find(cookie => cookie.startsWith('jid='));
        expect(newJidCookie).toBeDefined();
        // Further checks if new refresh token is different, etc.
      }
    });

    it('should fail to refresh token if refresh token cookie is missing', async () => {
      const response = await request(app).post(refreshUrl); // No cookie sent
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toContain('Refresh token not found');
    });

    it('should fail to refresh token if refresh token is invalid/expired', async () => {
      const response = await request(app)
        .post(refreshUrl)
        .set('Cookie', 'jid=invalidtoken; Path=/api/v1/auth; HttpOnly');
      expect(response.statusCode).toBe(401);
      // The actual message might depend on JWT library or custom error handling
      // e.g., 'Invalid refresh token', 'jwt malformed', 'TokenExpiredError'
      // For this test, we expect the use case to catch it and return a generic unauthorized
      expect(response.body.message).not.toBeUndefined();
    });
  });

  describe('POST /logout', () => {
    beforeEach(async () => {
      await clearDatabase();
      await request(app).post(registerUrl).send(testUser);
      const loginResponse = await request(app)
        .post(loginUrl)
        .send({ email: testUser.email, password: testUser.password });
      accessToken = loginResponse.body.accessToken;
      refreshTokenCookie = loginResponse.headers['set-cookie'].find(cookie => cookie.startsWith('jid='));
    });

    it('should logout user successfully and clear refresh token cookie', async () => {
      const response = await request(app)
        .post(logoutUrl)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie); // Send current cookie to simulate browser

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('Logout successful');

      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      const jidCookie = cookieHeader.find(cookie => cookie.startsWith('jid='));
      expect(jidCookie).toBeDefined();
      // Check that the cookie is cleared (e.g., expires in the past or max-age=0)
      expect(jidCookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT|Max-Age=0/);

      // Verify refresh token is invalidated (try to use it again)
      const refreshResponse = await request(app)
        .post(refreshUrl)
        .set('Cookie', refreshTokenCookie); // Send the old (now supposedly invalid) cookie
      expect(refreshResponse.statusCode).toBe(401); // Should fail
    });

    it('should fail to logout if access token is missing/invalid', async () => {
      const response = await request(app)
        .post(logoutUrl)
        .set('Cookie', refreshTokenCookie); // No access token
      expect(response.statusCode).toBe(401); // Or 403 if auth middleware distinguishes
      // Message depends on auth.middleware.js
      expect(response.body.message).toMatch(/No token provided|Invalid token/i);
    });
  });

  // TODO: Add tests for /request-verification-email and /verify-email
  // These will require mocking the email service or inspecting DB for tokens/status.

});

// Add more describe blocks for other API groups (Users, Games, Tournaments, Wallet, Admin etc.)
// Example structure:
/*
describe('Users API (/api/v1/users)', () => {
  describe('GET /me', () => {
    // ... tests for fetching user profile
  });
  describe('PUT /me', () => {
    // ... tests for updating user profile
  });
  // ... etc.
});
*/

// Placeholder for further tests to be implemented
describe('Games API (/api/v1/games)', () => {
    it.todo('should list all games');
    it.todo('should create a new game (admin only)');
    // ... more tests
});

describe('Tournaments API (/api/v1/tournaments)', () => {
    it.todo('should list all tournaments');
    it.todo('should create a new tournament (admin or specific role)');
    it.todo('should allow a user to register for a tournament');
    // ... more tests
});

// Add other describe blocks as needed...

// Note: This is a starting point. Comprehensive testing requires covering many scenarios
// including different user roles, edge cases, validation for all fields, pagination, sorting, filtering etc.
// For email verification, you'd typically mock the email service to capture sent emails/tokens
// or check database flags/tokens directly.
