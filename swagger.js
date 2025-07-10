const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.3' }); // Specify OpenAPI version here
const path = require('path');
const fs = require('fs');

// Attempt to read version from package.json
let appVersion = '1.0.0'; // Default version
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageJson.version) {
        appVersion = packageJson.version;
    }
} catch (e) {
    console.warn("Could not read version from package.json. Using default.", e);
}

const doc = {
    info: {
        title: 'Tournament Platform API',
        description: 'API documentation for the Tournament Platform project. This documentation is auto-generated.',
        version: appVersion,
        contact: {
            name: 'API Support',
            email: 'support@example.com', // Replace with actual support email
        },
        license: {
            name: 'MIT', // Or your project's license
            url: 'https://opensource.org/licenses/MIT', // Link to license
        },
    },
    servers: [
        {
            url: 'http://localhost:3000/api/v1', // Adjust if your base path is different
            description: 'Development server'
        },
        // Add other servers like staging or production if applicable
        // {
        //   url: 'https://api.yourdomain.com/api/v1',
        //   description: 'Production server'
        // }
    ],
    tags: [ // Define all expected tags here to ensure they appear and to control their order
        { name: 'Admin', description: 'Admin specific operations' },
        { name: 'Admin - Users', description: 'User management by Admins' },
        { name: 'Authentication', description: 'Authentication related endpoints (login, register, refresh, logout, email verification)' },
        { name: 'Games', description: 'Game management endpoints' },
        { name: 'Leaderboards', description: 'Leaderboard information' },
        { name: 'Matches', description: 'Match management and result submission' },
        { name: 'Teams', description: 'Team creation, management, and membership' },
        { name: 'Tournaments', description: 'Tournament management, participation, and progression' },
        { name: 'Users', description: 'User profile management (self-service)' },
        { name: 'User Game Profiles', description: 'Management of user profiles for specific games' },
        { name: 'Wallet', description: 'User wallet and transaction management' },
        { name: 'Webhooks', description: 'Webhook endpoints for external services (e.g., payment gateways)'} // Assuming this might exist
    ],
    components: {
        schemas: {
            // --- General Schemas ---
            ErrorResponse: {
                type: "object",
                properties: {
                    statusCode: { type: "integer", description: "HTTP status code", example: 400 },
                    message: { type: "string", description: "General error message", example: "Validation Error" },
                    errors: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional array of specific error messages",
                        example: ["'email' is required"]
                    },
                    stack: { type: "string", description: "Optional stack trace (in development)", example: "Error: ... at ..." }
                },
                required: ["statusCode", "message"]
            },
            SuccessResponse: { // A generic success response for simple messages
                type: "object",
                properties: {
                    message: { type: "string", description: "Success message" }
                },
                required: ["message"]
            },
            PaginatedResponse: { // Generic structure for paginated lists
                type: "object",
                properties: {
                    page: { type: "integer", description: "Current page number", example: 1 },
                    limit: { type: "integer", description: "Items per page", example: 10 },
                    totalPages: { type: "integer", description: "Total number of pages", example: 5 },
                    totalItems: { type: "integer", description: "Total number of items", example: 48 },
                    // 'items' property will be defined by the specific paginated response using allOf
                }
            },

            // --- Auth Schemas (as seen in auth.routes.js) ---
            UserRegistrationRequest: {
                type: "object",
                properties: {
                    username: { type: "string", minLength: 3, maxLength: 30, description: "User's desired username", example: "newuser" },
                    email: { type: "string", format: "email", description: "User's email address", example: "user@example.com" },
                    password: { type: "string", minLength: 8, description: "User's password", example: "password123" }
                },
                required: ["username", "email", "password"]
            },
            UserLoginRequest: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email", description: "User's email address", example: "user@example.com" },
                    password: { type: "string", description: "User's password", example: "password123" }
                },
                required: ["email", "password"]
            },
            UserPublicProfile: { // Consistent User Profile schema
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "User's unique identifier" },
                    username: { type: "string", description: "User's username" },
                    role: { type: "string", description: "User's role", enum: ["User", "Admin", "DisputeModerator", "FinanceManager"], example: "User" },
                    // Add other publicly visible fields if necessary, e.g., isVerified
                    isVerified: { type: "boolean", description: "Indicates if the user's email is verified", example: true}
                }
            },
            AuthResponse: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Success message", example: "Login successful" },
                    accessToken: { type: "string", format: "jwt", description: "JWT Access Token" },
                    user: { $ref: "#/components/schemas/UserPublicProfile" }
                },
                required: ["message", "accessToken", "user"]
            },
            RefreshTokenResponse: {
                type: "object",
                properties: {
                    accessToken: { type: "string", format: "jwt", description: "New JWT Access Token" }
                },
                required: ["accessToken"]
            },
            LogoutResponse: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Logout successful" }
                },
                required: ["message"]
            },
            RequestVerificationEmailResponse: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Confirmation message", example: "Verification email sent." }
                },
                required: ["message"]
            },
            VerifyEmailRequest: {
                type: "object",
                properties: {
                    token: { type: "string", description: "The verification token received by email." }
                },
                required: ["token"]
            },
            VerifyEmailResponse: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Success message", example: "Email verified successfully." },
                    userId: { type: "string", format: "uuid", description: "User ID of the verified user" }
                },
                required: ["message", "userId"]
            },

            // --- User Schemas (as seen in users.routes.js) ---
            UpdateUserProfileRequest: {
                type: "object",
                properties: {
                    username: { type: "string", minLength: 3, description: "New username for the user", example: "new_username_123" }
                },
                minProperties: 1 // Ensure at least one field is provided
            },
            AdminUpdateUserRequest: {
                type: "object",
                properties: {
                    username: { type: "string", minLength: 3, description: "New username for the user", example: "updated_user" },
                    email: { type: "string", format: "email", description: "New email for the user", example: "updated_user@example.com" },
                    role: { type: "string", enum: ["User", "Admin", "DisputeModerator", "FinanceManager"], description: "New role for the user", example: "Admin" },
                    isVerified: { type: "boolean", description: "Set email verification status", example: true }
                },
                minProperties: 1
            },
            PaginatedUsersResponse: { // Specific paginated response for users
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { $ref: "#/components/schemas/UserPublicProfile" }
                            }
                        }
                    }
                ]
            },

            // --- User Game Profile Schemas (as seen in users.routes.js) ---
            UserGameProfileBase: {
                type: "object",
                properties: {
                    gameId: { type: "string", format: "uuid", description: "ID of the game." },
                    inGameName: { type: "string", description: "User's in-game name for this game.", example: "PlayerOne" },
                    additionalInfo: { type: "object", description: "Any other game-specific details (e.g., region, platform).", example: {"region": "EUW", "rank": "Diamond"} }
                },
                required: ["gameId", "inGameName"]
            },
            UserGameProfileRequest: { // For POST/PUT body
                allOf: [ { $ref: "#/components/schemas/UserGameProfileBase" } ]
            },
            UserGameProfileResponse: { // For responses
                allOf: [
                    { $ref: "#/components/schemas/UserGameProfileBase" },
                    {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid", description: "ID of the user game profile record." },
                            userId: { type: "string", format: "uuid", description: "ID of the user." },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" }
                        }
                    }
                ]
            },
            ListOfUserGameProfiles: {
                type: "object",
                properties: {
                    profiles: { type: "array", items: { $ref: "#/components/schemas/UserGameProfileResponse" } },
                    count: { type: "integer", example: 1 }
                },
                required: ["profiles", "count"]
            },

            // --- Team Schemas (derived from teams.routes.js Joi schemas) ---
            TeamBase: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 3, maxLength: 50, description: "Name of the team", example: "The Terminators" },
                    tag: { type: "string", minLength: 2, maxLength: 10, pattern: "^[a-zA-Z0-9]*$", description: "Short tag for the team (alphanumeric, uppercase suggested)", example: "TRM" },
                    description: { type: "string", maxLength: 255, nullable: true, description: "Optional description for the team", example: "We play to win!" }
                },
                required: ["name"]
            },
            TeamRequest: { // For POST/PUT body
                allOf: [ { $ref: "#/components/schemas/TeamBase" } ]
            },
            TeamMember: {
                type: "object",
                properties: {
                    userId: { type: "string", format: "uuid", description: "ID of the team member" },
                    role: { type: "string", enum: ["owner", "captain", "co-captain", "member"], description: "Role of the member in the team", default: "member" },
                    joinedAt: { type: "string", format: "date-time", description: "Timestamp when the member joined" }
                }
            },
            TeamResponse: { // For GET responses
                allOf: [
                    { $ref: "#/components/schemas/TeamBase" },
                    {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid", description: "Unique ID of the team" },
                            ownerId: { type: "string", format: "uuid", description: "ID of the user who owns the team" },
                            members: { type: "array", items: { $ref: "#/components/schemas/TeamMember" } },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" }
                        }
                    }
                ]
            },
            AddTeamMemberRequest: {
                type: "object",
                properties: {
                    userId: { type: "string", format: "uuid", description: "ID of the user to add as a member." },
                    role: { type: "string", enum: ["member", "captain", "co-captain"], default: "member", description: "Role to assign to the new member." }
                },
                required: ["userId"]
            },
            PaginatedTeamsResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { $ref: "#/components/schemas/TeamResponse" }
                            }
                        }
                    }
                ]
            },
            // TODO: Add schemas for Games, Tournaments, Matches, Leaderboards, Wallet as their JSDoc/Joi schemas become clear
            GameBase: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the game", example: "Epic Quest RPG" },
                    description: { type: "string", description: "Description of the game", example: "An immersive open-world RPG." },
                    genre: { type: "string", description: "Genre of the game", example: "RPG" },
                    platform: { type: "string", description: "Platform(s) the game is available on", example: "PC, PlayStation, Xbox" },
                    releaseDate: { type: "string", format: "date", description: "Release date of the game", example: "2023-10-26" },
                    developer: { type: "string", description: "Developer of the game", example: "Awesome Game Studios" },
                    publisher: { type: "string", description: "Publisher of the game", example: "Global Gaming Inc." },
                    thumbnailUrl: { type: "string", format: "url", nullable: true, description: "URL to the game's thumbnail image", example: "https://example.com/game_thumbnail.jpg" },
                    bannerUrl: { type: "string", format: "url", nullable: true, description: "URL to the game's banner image", example: "https://example.com/game_banner.jpg" },
                    rules: { type: "string", nullable: true, description: "Specific rules for tournaments of this game" }
                },
                required: ["name", "genre", "platform", "developer"]
            },
            GameRequest: { // For POST/PUT body
                allOf: [ { $ref: "#/components/schemas/GameBase" } ]
            },
            GameResponse: { // For GET responses
                allOf: [
                    { $ref: "#/components/schemas/GameBase" },
                    {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid", description: "Unique ID of the game" },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" }
                        }
                    }
                ]
            },
            PaginatedGamesResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { $ref: "#/components/schemas/GameResponse" }
                            }
                        }
                    }
                ]
            },
            // --- Leaderboard Schemas (derived from leaderboards.routes.js Joi schemas and placeholder) ---
            LeaderboardEntry: {
                type: "object",
                properties: {
                    rank: { type: "integer", description: "Rank of the user/entity in the leaderboard." },
                    userId: { type: "string", description: "Unique identifier of the user (could be UUID or other string format depending on actual User ID type).", example: "user-id-1000" },
                    username: { type: "string", description: "Username of the user.", example: "Player1000" },
                    // The metric itself (e.g., 'score', 'wins') will be dynamic based on query.
                    // We can define a generic 'value' or expect the metric name as a key.
                    // For simplicity, using a generic 'value' and noting the metric in description.
                    value: { type: "number", description: "The value of the metric for this entry (e.g., score, wins count, earnings amount)." },
                    gamesPlayed: { type: "integer", nullable: true, description: "Number of games played (example additional stat).", example: 55 }
                }
            },
            LeaderboardResponse: {
                type: "object",
                properties: {
                    leaderboard: { type: "array", items: { $ref: "#/components/schemas/LeaderboardEntry" } },
                    gameName: { type: "string", description: "Name of the game for this leaderboard." },
                    metric: { type: "string", enum: ['wins', 'score', 'rating', 'earnings'], description: "Metric used for ranking." },
                    period: { type: "string", enum: ['daily', 'weekly', 'monthly', 'all_time'], description: "Time period of the leaderboard." },
                    totalItems: { type: "integer", description: "Total number of entries in this leaderboard for the given filters." },
                    currentPage: { type: "integer", description: "Current page number." },
                    pageSize: { type: "integer", description: "Number of entries per page." },
                    totalPages: { type: "integer", description: "Total number of pages." }
                }
            },
            UserRankDetail: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "User ID." },
                    gameName: { type: "string", description: "Game name for the leaderboard context." },
                    metric: { type: "string", enum: ['wins', 'score', 'rating', 'earnings'], description: "Metric." },
                    period: { type: "string", enum: ['daily', 'weekly', 'monthly', 'all_time'], description: "Period." },
                    rank: { type: "integer", description: "User's current rank." },
                    // value: { type: "number", description: "User's score/value for the metric." }, // Similar to LeaderboardEntry, actual metric name might be used
                    // Using a dynamic key for the metric value as in placeholder:
                    // For Swagger, it's better to have a fixed structure if possible, or use additionalProperties.
                    // Let's assume the metric value is returned as a key matching the metric name.
                    // This is harder to strictly define in Swagger without knowing all possible metrics.
                    // For now, will omit explicit metric value key here, assuming it's part of the response.
                    // Or, can add 'value' like in LeaderboardEntry. Let's add 'value' for consistency.
                    value: { type: "number", description: "User's score/value for the metric." },
                    surrounding: {
                        type: "array",
                        items: { $ref: "#/components/schemas/LeaderboardEntry" },
                        description: "List of leaderboard entries surrounding the user (e.g., +/- 2 ranks)."
                    }
                }
            },
            // --- Match Schemas (derived from matches.routes.js Joi schemas and logic) ---
            MatchParticipantInfo: { // Reusable component for participant details in a match
                type: "object",
                properties: {
                    id: { type: "string", format:"uuid", description: "Participant ID (User or Team ID)" },
                    name: { type: "string", description: "Name of the participant (username or team name)" },
                    // Assuming inGameName is also fetched and relevant
                    inGameName: { type: "string", nullable: true, description: "In-game name if applicable (e.g., for a UserGameProfile related to the match's game)" }
                }
            },
            MatchDetailsResponse: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "Match ID" },
                    tournamentId: { type: "string", format: "uuid", description: "ID of the tournament this match belongs to" },
                    gameId: { type: "string", format: "uuid", description: "ID of the game being played" },
                    status: { type: "string", enum: ["PENDING", "ONGOING", "COMPLETED", "DISPUTED", "CANCELLED"], description: "Current status of the match" },
                    round: { type: "integer", description: "Round number in the tournament" },
                    scheduledTime: { type: "string", format: "date-time", nullable: true, description: "Scheduled time for the match" },
                    startTime: { type: "string", format: "date-time", nullable: true, description: "Actual start time of the match" },
                    endTime: { type: "string", format: "date-time", nullable: true, description: "Actual end time of the match" },
                    participant1: { $ref: "#/components/schemas/MatchParticipantInfo" },
                    participant2: { $ref: "#/components/schemas/MatchParticipantInfo" },
                    scoreParticipant1: { type: "integer", nullable: true, description: "Score for participant 1" },
                    scoreParticipant2: { type: "integer", nullable: true, description: "Score for participant 2" },
                    winningParticipantId: { type: "string", format: "uuid", nullable: true, description: "ID of the winning participant" },
                    resultScreenshotUrl: { type: "string", format: "url", nullable: true, description: "URL of the result screenshot" },
                    nextMatchId: { type: "string", format: "uuid", nullable: true, description: "ID of the next match for the winner" },
                    // Add any other relevant fields from your Match entity or GetMatchUseCase response
                }
            },
            UploadUrlRequest: { // Based on uploadUrlRequestSchema in matches.routes.js
                type: "object",
                properties: {
                    filename: { type: "string", pattern: "^[^/\\0]+\\.(png|jpe?g|gif)$", description: "Image filename (e.g., result.jpg). Must be png, jpg, jpeg, or gif. No slashes.", example:"match_screenshot.png" },
                    contentType: { type: "string", enum: ["image/png", "image/jpeg", "image/gif"], description: "MIME type of the image.", example: "image/png"}
                },
                required: ["filename", "contentType"]
            },
            UploadUrlResponse: {
                type: "object",
                properties: {
                    uploadUrl: { type: "string", format: "url", description: "The pre-signed URL to upload the file to." },
                    fileKey: { type: "string", description: "The S3 object key where the file will be stored. This key should be sent when submitting the match result." }
                },
                required: ["uploadUrl", "fileKey"]
            },
            SubmitResultRequest: { // Based on submitResultSchema in matches.routes.js
                type: "object",
                properties: {
                    winningParticipantId: { type: "string", format: "uuid", description: "ID of the user or team that won." },
                    scoreParticipant1: { type: "integer", minimum: 0, nullable: true, description: "Final score for participant 1." },
                    scoreParticipant2: { type: "integer", minimum: 0, nullable: true, description: "Final score for participant 2." },
                    resultScreenshotFileKey: { type: "string", description: "S3 file key of the uploaded screenshot (obtained from /upload-url endpoint)." },
                    comments: { type: "string", maxLength: 500, nullable: true, description: "Optional comments about the match result." }
                },
                required: ["winningParticipantId", "resultScreenshotFileKey"]
            },
            MatchResultResponse: { // Based on responsePayload in POST /:id/results
                type: "object",
                properties: {
                    message: { type: "string", description: "Message confirming the result submission." },
                    matchId: { type: "string", format: "uuid", description: "ID of the match for which the result was submitted." },
                    status: { type: "string", enum: ["PENDING", "ONGOING", "COMPLETED", "DISPUTED", "CANCELLED"], description: "Updated status of the match." }
                },
                required: ["message", "matchId", "status"]
            },
            // --- Tournament Schemas (derived from tournaments.routes.js Joi schemas and logic) ---
            TournamentCreationRequest: { // Based on createTournamentSchema
                type: "object",
                properties: {
                    name: { type: "string", minLength: 3, maxLength: 100, description: "Name of the tournament." },
                    gameId: { type: "string", format: "uuid", description: "ID of the game for this tournament." },
                    description: { type: "string", maxLength: 1000, nullable: true, description: "Optional description of the tournament." },
                    rules: { type: "string", maxLength: 5000, nullable: true, description: "Optional rules for the tournament." },
                    entryFee: { type: "number", format: "float", minimum: 0, description: "Entry fee for the tournament (e.g., 10.00)." },
                    prizePool: { type: "number", format: "float", minimum: 0, description: "Total prize pool for the tournament." },
                    maxParticipants: { type: "integer", minimum: 2, maximum: 1024, description: "Maximum number of participants." },
                    startDate: { type: "string", format: "date-time", description: "Start date and time of the tournament in ISO 8601 format. Must be in the future." },
                    endDate: { type: "string", format: "date-time", nullable: true, description: "End date and time of the tournament in ISO 8601 format. Must be after startDate." },
                    organizerId: { type: "string", format: "uuid", nullable: true, description: "ID of the user organizing the tournament (if not the admin creating it)." }
                },
                required: ["name", "gameId", "entryFee", "prizePool", "maxParticipants", "startDate"]
            },
            TournamentGameInfo: { // Reusable for game details in tournament responses
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "Game ID" },
                    name: { type: "string", description: "Name of the game" },
                    // Potentially other minimal game details like thumbnail
                    thumbnailUrl: { type: "string", format: "url", nullable: true }
                }
            },
            TournamentResponseBase: { // Common fields for tournament responses
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "Tournament ID" },
                    name: { type: "string", description: "Tournament name" },
                    description: { type: "string", nullable: true },
                    rules: { type: "string", nullable: true },
                    status: { type: "string", enum: ["PENDING", "UPCOMING", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ONGOING", "COMPLETED", "CANCELED"], description: "Current status of the tournament" },
                    entryFee: { type: "number", format: "float" },
                    prizePool: { type: "number", format: "float" },
                    maxParticipants: { type: "integer" },
                    currentParticipantsCount: { type: "integer", description: "Number of currently registered participants" },
                    startDate: { type: "string", format: "date-time" },
                    endDate: { type: "string", format: "date-time", nullable: true },
                    organizerId: { type: "string", format: "uuid", nullable: true },
                    game: { $ref: "#/components/schemas/TournamentGameInfo" }, // Embed game details
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                }
            },
            TournamentSummaryResponse: { // For lists - might have fewer fields than full details
                allOf: [
                    {
                        type: "object",
                        properties: { // Select fields for summary view
                            id: { type: "string", format: "uuid" },
                            name: { type: "string" },
                            // gameName is used in current route logic, so let's reflect that for now
                            // if game object is included, this can be derived
                            gameName: { type: "string", description: "Name of the game (can be part of an embedded game object too)"},
                            status: { type: "string", enum: ["PENDING", "UPCOMING", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ONGOING", "COMPLETED", "CANCELED"] },
                            entryFee: { type: "number", format: "float" },
                            prizePool: { type: "number", format: "float" },
                            maxParticipants: { type: "integer" },
                            currentParticipants: { type: "integer", description: "Number of currently registered participants" }, // Align with route logic
                            startDate: { type: "string", format: "date-time" },
                        }
                    }
                ]
            },
            TournamentResponseFull: { // For GET /:id - full details
                allOf: [
                    { $ref: "#/components/schemas/TournamentResponseBase" },
                    {
                        type: "object",
                        properties: {
                            // Potentially add more detailed fields like list of participants (summary), match structure etc.
                            // participants: { type: "array", items: { $ref: "#/components/schemas/UserPublicProfile" } }, // Example if participants are included
                            // matches: { type: "array", items: { $ref: "#/components/schemas/MatchDetailsResponse" } } // Example if matches are included
                        }
                    }
                ]
            },
            PaginatedTournamentsResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { $ref: "#/components/schemas/TournamentSummaryResponse" }
                            }
                        }
                    }
                ]
            },
            TournamentRegistrationResponse: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Successfully registered for tournament." },
                    participantId: { type: "string", format: "uuid", description: "ID of the tournament participant record (if applicable)." },
                    tournamentId: { type: "string", format: "uuid" },
                    userId: { type: "string", format: "uuid" },
                    status: { type: "string", description: "Status of the registration (e.g., CONFIRMED, PENDING_PAYMENT).", example: "CONFIRMED" }
                }
            },
            // --- Wallet & Transaction Schemas (derived from wallet.routes.js Joi schemas and logic) ---
            WalletDetailsResponse: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "Wallet ID." },
                    userId: { type: "string", format: "uuid", description: "User ID associated with the wallet." },
                    balance: { type: "number", format: "float", description: "Current available balance." },
                    currency: { type: "string", length: 3, description: "Currency code (e.g., IRR, USD)." },
                    pendingBalance: { type: "number", format: "float", description: "Balance that is pending (e.g., from deposits not yet cleared or withdrawals being processed)." },
                    lastTransactionDate: { type: "string", format: "date-time", nullable: true, description: "Timestamp of the last transaction." },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                }
            },
            InitializeDepositRequest: { // Based on initializeDepositSchema
                type: "object",
                properties: {
                    amount: { type: "number", format: "float", minimum: 0.01, description: "Amount to deposit (must be positive, max 2 decimal places)." },
                    currency: { type: "string", length: 3, description: "Currency code (e.g., IRR, USD).", example: "IRR" }
                },
                required: ["amount", "currency"]
            },
            InitializeDepositResponse: {
                type: "object",
                properties: {
                    paymentGatewayUrl: { type: "string", format: "url", description: "URL to redirect the user to for completing the payment." },
                    transactionId: { type: "string", format: "uuid", description: "Unique ID for this deposit transaction." },
                    status: { type: "string", nullable: true, description: "Status of the transaction if idempotency key caused a replay (e.g., PENDING, COMPLETED)." }
                },
                required: ["paymentGatewayUrl", "transactionId"]
            },
            TransactionHistoryItem: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", description: "Transaction ID." },
                    walletId: { type: "string", format: "uuid", description: "Wallet ID." },
                    type: { type: "string", enum: ['DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT'], description: "Type of transaction." },
                    status: { type: "string", enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REQUIRES_APPROVAL', 'PROCESSING', 'REFUNDED'], description: "Status of the transaction." },
                    amount: { type: "number", format: "float", description: "Transaction amount. Positive for credits, negative for debits." },
                    currency: { type: "string", length: 3, description: "Currency code." },
                    description: { type: "string", nullable: true, description: "Optional description of the transaction." },
                    transactionDate: { type: "string", format: "date-time", description: "Date and time of the transaction." },
                    relatedEntityId: { type: "string", format: "uuid", nullable: true, description: "ID of a related entity (e.g., tournamentId, matchId)." },
                    relatedEntityType: { type: "string", nullable: true, description: "Type of the related entity (e.g., TOURNAMENT, MATCH)." },
                    gatewayTransactionId: { type: "string", nullable: true, description: "ID from the payment gateway, if applicable." },
                    metadata: { type: "object", additionalProperties: true, nullable: true, description: "Any additional metadata." }
                }
            },
            PaginatedTransactionHistoryResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { $ref: "#/components/schemas/TransactionHistoryItem" } }
                        }
                    }
                ]
            },
            WithdrawalMethodDetails: { // Based on Joi schema
                type: "object",
                properties: {
                    type: { type: "string", enum: ['PAYPAL', 'BANK_TRANSFER'], description: "Type of withdrawal method." },
                    email: { type: "string", format: "email", description: "PayPal email address (required if type is PAYPAL)." },
                    accountHolderName: { type: "string", description: "Bank account holder name (required if type is BANK_TRANSFER)." },
                    accountNumber: { type: "string", description: "Bank account number (required if type is BANK_TRANSFER)." },
                    routingNumber: { type: "string", description: "Bank routing number (required if type is BANK_TRANSFER)." },
                    bankName: { type: "string", nullable: true, description: "Name of the bank (optional for BANK_TRANSFER)." }
                },
                required: ["type"]
                // Conditional requirements (email for PAYPAL, bank details for BANK_TRANSFER) are hard to express directly in OpenAPI 3.0 schema,
                // often handled by description or oneOf/anyOf if more complex.
            },
            RequestWithdrawalRequest: { // Based on requestWithdrawalSchema
                type: "object",
                properties: {
                    amount: { type: "number", format: "float", minimum: 0.01, description: "Amount to withdraw." },
                    currency: { type: "string", length: 3, description: "Currency code." },
                    withdrawalMethodDetails: { $ref: "#/components/schemas/WithdrawalMethodDetails" }
                },
                required: ["amount", "currency", "withdrawalMethodDetails"]
            },
            RequestWithdrawalResponse: {
                type: "object",
                properties: {
                    transactionId: { type: "string", format: "uuid", description: "ID of the withdrawal transaction created." },
                    status: { type: "string", enum: ['PENDING', 'REQUIRES_APPROVAL', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED'], description: "Current status of the withdrawal request." },
                    message: { type: "string", description: "Confirmation message."}
                },
                required: ["transactionId", "status", "message"]
            },
            // --- Admin Panel Schemas (derived from admin.routes.js Joi schemas and logic) ---
            DisputeTicketResponse: { // Schema for a single dispute ticket
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    matchId: { type: "string", format: "uuid" },
                    tournamentId: { type: "string", format: "uuid", nullable: true },
                    reportedByUserId: { type: "string", format: "uuid" },
                    reason: { type: "string" },
                    status: { type: "string", enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED', 'CLOSED_INVALID'] },
                    resolutionDetails: { type: "string", nullable: true },
                    moderatorId: { type: "string", format: "uuid", nullable: true, description: "ID of the admin/moderator who handled it." },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                    // Potentially include summary of Match, Reporter User, etc.
                    // reporterUsername: { type: "string", nullable: true },
                    // matchDetailsSummary: { type: "string", nullable: true } // e.g. "Match between P1 and P2 in Tournament X"
                }
            },
            PaginatedDisputesResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { $ref: "#/components/schemas/DisputeTicketResponse" } }
                        }
                    }
                ]
            },
            ResolveDisputeRequest: { // Based on resolveDisputeSchema
                type: "object",
                properties: {
                    resolutionStatus: { type: "string", enum: ['RESOLVED_PARTICIPANT1_WIN', 'RESOLVED_PARTICIPANT2_WIN', 'RESOLVED_REPLAY', 'CLOSED_INVALID'], description: "The final status to resolve the dispute." },
                    resolutionDetails: { type: "string", minLength:10, maxLength:1000, description: "Detailed explanation of the resolution." }
                },
                required: ["resolutionStatus", "resolutionDetails"]
            },
            WithdrawalRequestAdminView: { // Extends TransactionHistoryItem with user details for admin view
                allOf: [
                    { $ref: "#/components/schemas/TransactionHistoryItem" }, // Base transaction details
                    {
                        type: "object",
                        properties: {
                             userId: { type: "string", format: "uuid", description: "ID of the user who requested withdrawal." },
                             userUsername: { type: "string", description: "Username of the user.", example: "user123" }, // Added for admin convenience
                             withdrawalMethodDetails: { $ref: "#/components/schemas/WithdrawalMethodDetails" }, // Details of how to pay
                             adminNotes: { type: "string", nullable: true, description: "Notes added by admin during approval/rejection."}
                        }
                    }
                ]
            },
            PaginatedWithdrawalsAdminResponse: {
                allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { $ref: "#/components/schemas/WithdrawalRequestAdminView" } }
                        }
                    }
                ]
            },
            ApproveWithdrawalRequest: { // Based on approveWithdrawalSchema
                type: "object",
                properties: {
                    notes: { type: "string", maxLength: 500, nullable: true, description: "Optional notes by the admin approving the request." }
                }
            },
            RejectWithdrawalRequest: { // Based on rejectWithdrawalSchema
                type: "object",
                properties: {
                    reason: { type: "string", minLength:10, maxLength: 500, description: "Reason for rejecting the withdrawal request." }
                },
                required: ["reason"]
            }
        },
        securitySchemes: {
            bearerAuth: { // For JWT Access Token
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            // If you use API Keys or OAuth2 for other purposes, define them here.
            // Example for Refresh Token if it were sent as a header (not typical for refresh tokens)
            // refreshTokenHeader: {
            //   type: 'apiKey',
            //   in: 'header',
            //   name: 'X-Refresh-Token'
            // },
            // Note: Refresh token via HttpOnly cookie is handled by browser, not explicitly by securitySchemes,
            // but you can describe its necessity in endpoint descriptions or use a custom scheme if needed for tools.
            // For swagger-autogen, often the cookie mechanism is just described in text.
        }
    },
    // 'security' field at the global level would apply security to all endpoints by default.
    // It's often better to apply security per-endpoint via #swagger.security in JSDoc.
    // security: [ { bearerAuth: [] } ], // Example: make all endpoints require bearerAuth by default
};

const outputFile = './docs/swagger-generated.json';
const endpointsFiles = [
    // List all your route files here.
    // It's crucial that these files contain the JSDoc comments that swagger-autogen uses.
    './src/presentation/api/admin.routes.js',
    './src/presentation/api/auth.routes.js',
    './src/presentation/api/games.routes.js',
    './src/presentation/api/leaderboards.routes.js',
    './src/presentation/api/matches.routes.js',
    './src/presentation/api/teams.routes.js',
    './src/presentation/api/tournaments.routes.js',
    './src/presentation/api/users.routes.js',
    './src/presentation/api/wallet.routes.js'
    // Do NOT include app.js if your routes are self-contained and mounted there.
    // swagger-autogen works best by pointing directly to the files defining the router objects.
];

// Generate swagger.json
swaggerAutogen(outputFile, endpointsFiles, doc).then(async () => {
    console.log(`Swagger JSON file generated at ${outputFile}`);
    // Optionally, you can add a post-processing step here if needed,
    // for example, to convert to YAML or make minor adjustments.
    // For instance, ensuring 'swagger: "2.0"' is not present if it somehow gets added.
    try {
        let generatedSpec = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        if (generatedSpec.swagger) { // Remove OpenAPI 2.0 'swagger' field if present
            delete generatedSpec.swagger;
            fs.writeFileSync(outputFile, JSON.stringify(generatedSpec, null, 2), 'utf8');
            console.log(`Post-processing: Removed 'swagger: "2.0"' field if it existed.`);
        }
        // Ensure 'openapi' field is correctly set (already done by swaggerAutogen option)
        if (!generatedSpec.openapi || !generatedSpec.openapi.startsWith('3.0')) {
            generatedSpec.openapi = '3.0.3'; // Ensure it's set
             fs.writeFileSync(outputFile, JSON.stringify(generatedSpec, null, 2), 'utf8');
            console.log(`Post-processing: Ensured 'openapi: "3.0.3"' field is present.`);
        }

    } catch (e) {
        console.error("Error during post-processing of Swagger JSON file:", e);
    }

}).catch(err => {
    console.error("Error generating Swagger file:", err);
});

// To generate YAML output as well (optional):
// const swaggerAutogenYaml = require('swagger-autogen')({openapi: '3.0.3'});
// const outputFileYaml = './docs/swagger-generated.yaml';
// swaggerAutogenYaml(outputFileYaml, endpointsFiles, doc).then(() => {
//   console.log(`Swagger YAML file generated at ${outputFileYaml}`);
// }).catch(err => {
//   console.error("Error generating Swagger YAML file:", err);
// });
