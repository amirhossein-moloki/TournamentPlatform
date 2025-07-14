const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const userController = require('../../controllers/user.controller');
const { authenticateToken, authorizeRole } = require('../../../middleware/auth.middleware');

// --- Admin User Routes ---

// Get a list of all users (Admin only)
router.get('/', authenticateToken, authorizeRole(['Admin']), userController.listUsers);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Get a list of all users (Admin only)'
    #swagger.description = 'Retrieves a paginated list of all users. Can be filtered by role and verification status.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
    #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
    #swagger.parameters['role'] = { in: 'query', schema: { type: 'string' }, description: 'Filter users by role.' }
    #swagger.parameters['isVerified'] = { in: 'query', schema: { type: 'boolean' }, description: 'Filter users by verification status.' }
    #swagger.responses[200] = { description: 'A list of users.', schema: { $ref: '#/components/schemas/PaginatedUsersResponse' } }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
*/

// Get a specific user by ID (Admin only)
router.get('/:id', authenticateToken, authorizeRole(['Admin']), userController.getUserById);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Get a specific user by ID (Admin only)'
    #swagger.description = 'Retrieves the profile of a specific user by their ID.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.responses[200] = { description: 'User profile retrieved successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

// Update a user by ID (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['Admin']), userController.updateUserById);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Update a user by ID (Admin only)'
    #swagger.description = "Allows an Admin to update a user's profile information (username, email, roles, verification status)."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUpdateUserRequest" } } } }
    #swagger.responses[200] = { description: 'User updated successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

// Delete a user by ID (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['Admin']), userController.deleteUserById);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Delete a user by ID (Admin only)'
    #swagger.description = 'Allows an Admin to delete a user. An admin cannot delete their own account via this endpoint.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.responses[200] = { description: 'User deleted successfully.', schema: { $ref: '#/components/schemas/SuccessResponseMessage' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

// --- Admin Role Management ---

router.post('/:id/roles', authenticateToken, authorizeRole(['Admin']), userController.assignRole);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Assign a role to a user (Admin only)'
    #swagger.description = 'Adds a new role to a user\'s role list.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["role"],
                    properties: {
                        role: { type: "string", "enum": ["PLAYER", "ADMIN", "TOURNAMENT_MANAGER", "TOURNAMENT_SUPPORT", "GENERAL_SUPPORT"] }
                    }
                }
            }
        }
    }
    #swagger.responses[200] = { description: 'Role assigned successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

router.delete('/:id/roles/:role', authenticateToken, authorizeRole(['Admin']), userController.removeRole);
/*  #swagger.tags = ['Admin - Users']
    #swagger.summary = 'Remove a role from a user (Admin only)'
    #swagger.description = 'Removes a role from a user\'s role list.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { $ref: '#/components/parameters/UserIdPath' }
    #swagger.parameters['role'] = { "name": "role", "in": "path", "required": true, "description": "The role to remove.", "schema": { "type": "string" } }
    #swagger.responses[200] = { description: 'Role removed successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

module.exports = router;
