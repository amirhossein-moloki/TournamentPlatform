# API Documentation

This document provides a detailed description of the REST API for the Tournament Platform.

## Table of Contents

- [General Information](#general-information)
  - [Base URL](#base-url)
  - [Authentication](#authentication)
  - [Common Responses](#common-responses)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Admin](#admin)
  - [Games](#games)
  - [Tournaments](#tournaments)
  - [Matches](#matches)
  - [Leaderboards](#leaderboards)
  - [Wallet](#wallet)

---

## General Information

### Base URL

All API endpoints are prefixed with `/api/v1`.
- **Development Server**: `http://localhost:3000/api/v1`

### Authentication

Most endpoints require a `Bearer` token for authentication. The token should be included in the `Authorization` header.

- **Header**: `Authorization: Bearer <YOUR_JWT_ACCESS_TOKEN>`

Some endpoints, like `/auth/refresh`, rely on an `HttpOnly` cookie (`jid`) containing the refresh token.

### Common Responses

- **`400 Bad Request`**: The request was malformed, often due to validation errors. The response body will contain details.
- **`401 Unauthorized`**: Authentication is required and has failed or has not been provided.
- **`403 Forbidden`**: The authenticated user does not have the necessary permissions to perform the action.
- **`404 Not Found`**: The requested resource could not be found.
- **`409 Conflict`**: The request could not be completed because of a conflict with the current state of the resource (e.g., duplicate entry).
- **`500 Internal Server Error`**: An unexpected error occurred on the server.

---

## API Endpoints

### Auth

Endpoints for user registration, login, and token management.

#### `POST /auth/register`
- **Summary**: Register a new user.
- **Description**: Registers a new user, logs them in, provides an access token in the response body, and sets a refresh token in an HttpOnly cookie.
- **Request Body**:
  - `username` (string, required): Desired username.
  - `email` (string, required): User's email address.
  - `password` (string, required): User's password (min 8 characters).
- **Responses**:
  - `201 Created`: Returns an `AuthResponse` object containing the `user` profile and `accessToken`. Sets the refresh token cookie.
  - `400 Bad Request`, `409 Conflict`, `500 Internal Server Error`.

#### `POST /auth/login`
- **Summary**: Log in an existing user.
- **Request Body**:
  - `email` (string, required): User's email.
  - `password` (string, required): User's password.
- **Responses**:
  - `200 OK`: Returns an `AuthResponse` object. Sets the refresh token cookie.
  - `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`.

#### `POST /auth/refresh`
- **Summary**: Refresh an access token.
- **Description**: Uses the `HttpOnly` refresh token cookie (`jid`) to generate a new access token.
- **Responses**:
  - `200 OK`: Returns a `RefreshTokenResponse` object containing the new `accessToken`. May also set a new refresh token cookie if rotation is enabled.
  - `401 Unauthorized`, `500 Internal Server Error`.

#### `POST /auth/logout`
- **Summary**: Log out the current user.
- **Security**: `bearerAuth` required.
- **Responses**:
  - `200 OK`: Returns a success message. Clears the refresh token cookie.
  - `401 Unauthorized`, `500 Internal Server Error`.

#### `POST /auth/request-verification-email`
- **Summary**: Request a new email verification link.
- **Security**: `bearerAuth` required.
- **Responses**:
  - `200 OK`: Returns a `RequestVerificationEmailResponse` object with a confirmation message.
  - `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

#### `POST /auth/verify-email`
- **Summary**: Verify user's email using a token.
- **Request Body**:
  - `token` (string, required): The verification token from the email.
- **Responses**:
  - `200 OK`: Returns a `VerifyEmailResponse` object with a success message and the `userId`.
  - `400 Bad Request`, `500 Internal Server Error`.

### Users

Endpoints for managing user profiles.

#### `GET /users/me`
- **Summary**: Get current user's profile.
- **Security**: `bearerAuth` required.
- **Responses**:
  - `200 OK`: Returns a `UserPublicProfile` object.
  - `401 Unauthorized`, `404 Not Found`.

#### `PUT /users/me`
- **Summary**: Update current user's profile.
- **Security**: `bearerAuth` required.
- **Request Body**:
  - `username` (string, optional): New username.
- **Responses**:
  - `200 OK`: Returns the updated `UserPublicProfile` object.
  - `400 Bad Request`, `401 Unauthorized`.

### Admin

Admin-only endpoints for managing the platform.

#### `GET /users`
- **Summary**: Get a list of all users (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Query Parameters**:
  - `page` (integer, optional)
  - `limit` (integer, optional)
  - `role` (string, optional): Filter by user role.
  - `isVerified` (boolean, optional): Filter by verification status.
- **Responses**:
  - `200 OK`: Returns a paginated list of `UserPublicProfile` objects.
  - `401 Unauthorized`, `403 Forbidden`.

#### `GET /users/{id}`
- **Summary**: Get a specific user by ID (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The user's ID.
- **Responses**:
  - `200 OK`: Returns a `UserPublicProfile` object.
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `PUT /users/{id}`
- **Summary**: Update a user by ID (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The user's ID.
- **Request Body**:
  - `username` (string, optional)
  - `email` (string, optional)
  - `roles` (array of strings, optional)
  - `isVerified` (boolean, optional)
- **Responses**:
  - `200 OK`: Returns the updated `UserPublicProfile` object.
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `DELETE /users/{id}`
- **Summary**: Delete a user by ID (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The user's ID.
- **Responses**:
  - `200 OK`: Returns a success message.
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `POST /users/{id}/roles`
- **Summary**: Assign a role to a user (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The user's ID.
- **Request Body**:
  - `role` (string, required): The role to assign.
- **Responses**:
  - `200 OK`: Returns the updated `UserPublicProfile` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `DELETE /users/{id}/roles/{role}`
- **Summary**: Remove a role from a user (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The user's ID.
  - `role` (string, required): The role to remove.
- **Responses**:
  - `200 OK`: Returns the updated `UserPublicProfile` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### Games

Endpoints for managing games, typically restricted to Admins.

#### `POST /games`
- **Summary**: Create a new game (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Request Body**: A `Game` object. See schemas section for details.
- **Responses**:
  - `201 Created`: Returns the newly created `Game` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`.

#### `GET /games`
- **Summary**: Get a list of games.
- **Query Parameters**:
  - `page` (integer, optional)
  - `limit` (integer, optional)
  - `isActive` (boolean, optional): Filter by active status.
- **Responses**:
  - `200 OK`: Returns a paginated list of `Game` objects.
  - `400 Bad Request`.

#### `GET /games/{id}`
- **Summary**: Get game details by ID.
- **Path Parameters**:
  - `id` (string, required): The game's ID.
- **Responses**:
  - `200 OK`: Returns the `Game` object.
  - `404 Not Found`.

#### `PUT /games/{id}`
- **Summary**: Update a game by ID (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The game's ID.
- **Request Body**: A `Game` object with fields to update.
- **Responses**:
  - `200 OK`: Returns the updated `Game` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `DELETE /games/{id}`
- **Summary**: Delete a game by ID (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Path Parameters**:
  - `id` (string, required): The game's ID.
- **Responses**:
  - `200 OK`: Returns a success message.
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### Tournaments

Endpoints for creating, viewing, and interacting with tournaments.

#### `POST /tournaments`
- **Summary**: Create a new tournament (Admin only).
- **Security**: `bearerAuth` and `Admin` role required.
- **Request Body**: A `TournamentCreationRequest` object.
- **Responses**:
  - `201 Created`: Returns the full `TournamentDetails` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (if gameId doesn't exist).

#### `GET /tournaments`
- **Summary**: Get a list of tournaments.
- **Query Parameters**:
  - `page` (integer, optional)
  - `limit` (integer, optional)
  - `status` (string, optional): Filter by status (e.g., `REGISTRATION_OPEN`, `ONGOING`).
  - `gameName` (string, optional): Filter by game name.
  - `sortBy` (string, optional): Field to sort by (e.g., `startDate`, `name`).
  - `sortOrder` (string, optional): `ASC` or `DESC`.
- **Responses**:
  - `200 OK`: Returns a `PaginatedTournaments` object.
  - `400 Bad Request`.

#### `GET /tournaments/{id}`
- **Summary**: Get tournament details by ID.
- **Path Parameters**:
  - `id` (string, required): The tournament's ID.
- **Query Parameters**:
  - `include` (string, optional): Comma-separated list of relations to include (e.g., "participants,matches").
- **Responses**:
  - `200 OK`: Returns the `TournamentDetails` object.
  - `404 Not Found`.

#### `POST /tournaments/{id}/register`
- **Summary**: Register for a tournament.
- **Security**: `bearerAuth` required.
- **Path Parameters**:
  - `id` (string, required): The tournament's ID.
- **Responses**:
  - `200 OK`: Returns a `TournamentRegistrationResponse` object.
  - `400 Bad Request` (e.g., registration closed), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### Matches

Endpoints for managing match details and results.

#### `GET /matches/{id}`
- **Summary**: Get match details by ID.
- **Security**: `bearerAuth` required.
- **Path Parameters**:
  - `id` (string, required): The match ID.
- **Responses**:
  - `200 OK`: Returns a `Match` object.
  - `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

#### `POST /matches/{id}/results/upload-url`
- **Summary**: Get pre-signed URL for match result screenshot.
- **Security**: `bearerAuth` required.
- **Path Parameters**:
  - `id` (string, required): The match ID.
- **Request Body**:
  - `filename` (string, required): e.g., "result.jpg". Must be png, jpg, jpeg, or gif.
  - `contentType` (string, required): e.g., "image/jpeg".
- **Responses**:
  - `200 OK`: Returns an `UploadUrlResponse` object with `uploadUrl` and `fileKey`.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

#### `POST /matches/{id}/results`
- **Summary**: Submit match result.
- **Security**: `bearerAuth` required.
- **Path Parameters**:
  - `id` (string, required): The match ID.
- **Request Body**:
  - `winningParticipantId` (string, required, uuid): ID of the winner.
  - `scoreParticipant1` (integer, optional)
  - `scoreParticipant2` (integer, optional)
  - `resultScreenshotFileKey` (string, required): S3 file key from the upload step.
  - `comments` (string, optional)
- **Responses**:
  - `200 OK`: Returns the updated `Match` object.
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

### Leaderboards

Endpoints for retrieving leaderboard information.

#### `GET /leaderboards`
- **Summary**: Get a leaderboard.
- **Query Parameters**:
  - `gameName` (string, required)
  - `metric` (string, optional, enum: `wins`, `score`, `rating`, `earnings`, default: `rating`)
  - `period` (string, optional, enum: `daily`, `weekly`, `monthly`, `all_time`, default: `all_time`)
  - `page` (integer, optional)
  - `limit` (integer, optional)
- **Responses**:
  - `200 OK`: Returns a `LeaderboardResponse` object containing the leaderboard entries and pagination details.
  - `400 Bad Request`, `500 Internal Server Error`.

#### `GET /leaderboards/user/{userId}`
- **Summary**: Get user's rank on leaderboards.
- **Path Parameters**:
  - `userId` (string, required, uuid)
- **Query Parameters**:
  - `gameName` (string, required)
  - `metric` (string, optional, enum: `wins`, `score`, `rating`, `earnings`, default: `rating`)
  - `period` (string, optional, enum: `daily`, `weekly`, `monthly`, `all_time`, default: `all_time`)
  - `surroundingCount` (integer, optional, default: 5): Number of entries to show above and below the user.
- **Responses**:
  - `200 OK`: Returns a `UserRankDetail` object.
  - `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.

### Wallet

Endpoints for managing user wallets and transactions.

#### `GET /wallet`
- **Summary**: Get user's wallet details.
- **Security**: `bearerAuth` required.
- **Responses**:
  - `200 OK`: Returns `WalletDetailsResponse` object.
  - `401 Unauthorized`, `404 Not Found`.

#### `POST /wallet/deposit/initialize`
- **Summary**: Initialize a deposit.
- **Security**: `bearerAuth` required.
- **Headers**:
  - `X-Idempotency-Key` (string, required, uuid)
- **Request Body**:
  - `amount` (number, required, positive)
  - `currency` (string, required, e.g., "IRR", "USD")
- **Responses**:
  - `200 OK`: Returns `InitializeDepositResponse` object with `paymentGatewayUrl` and `transactionId`.
  - `400 Bad Request`, `401 Unauthorized`, `409 Conflict` (idempotency).

#### `GET /wallet/history`
- **Summary**: Get user's transaction history.
- **Security**: `bearerAuth` required.
- **Query Parameters**:
  - `page` (integer, optional)
  - `limit` (integer, optional)
  - `type` (string, optional, enum: `DEPOSIT`, `WITHDRAWAL`, etc.)
  - `status` (string, optional, enum: `PENDING`, `COMPLETED`, etc.)
  - `sortBy` (string, optional, enum: `transactionDate`, `amount`)
  - `sortOrder` (string, optional, enum: `ASC`, `DESC`)
- **Responses**:
  - `200 OK`: Returns `PaginatedTransactionHistoryResponse` object.
  - `401 Unauthorized`.

#### `POST /wallet/withdrawals`
- **Summary**: Request a withdrawal.
- **Security**: `bearerAuth` required.
- **Headers**:
  - `X-Idempotency-Key` (string, required, uuid)
- **Request Body**:
  - `amount` (number, required, positive)
  - `currency` (string, required)
  - `withdrawalMethodDetails` (object, required): Details specific to the chosen method (e.g., PayPal email, bank account info).
- **Responses**:
  - `202 Accepted`: Withdrawal request accepted. Returns `RequestWithdrawalResponse`.
  - `200 OK`: Idempotent replay. Returns `RequestWithdrawalResponse`.
  - `400 Bad Request` (e.g., insufficient funds), `401 Unauthorized`, `409 Conflict`.
