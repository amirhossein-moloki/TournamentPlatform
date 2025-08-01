const router = require('express').Router();
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const { UserRoles } = require('../../domain/user/user.entity');
const validate = require('../../middleware/validation.middleware');
const {
  teamIdParamSchema,
  createTeamSchema,
  updateTeamSchema,
  listTeamsSchema,
} = require('../validators/team.validator');
const {
    addMemberSchema,
    removeMemberSchema,
} = require('../validators/teamMember.validator');


module.exports = ({ teamController }) => {
    // --- Routes ---

    router.post('/', authenticateToken, validate(createTeamSchema), teamController.createTeam);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Create a new team'
        #swagger.description = 'Creates a new team, with the authenticated user as the owner.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TeamRequest" } } } }
        #swagger.responses[201] = { description: 'Team created successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/TeamResponse" } } } }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[409] = { description: 'Team name or tag already exists.', schema: { $ref: '#/components/schemas/ErrorResponse' } }
    */

    router.get('/', validate(listTeamsSchema), teamController.getAllTeams);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Get a list of all teams'
        #swagger.description = 'Retrieves a paginated list of all teams.'
        #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
        #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
        #swagger.responses[200] = { description: 'A list of teams.', content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTeamsResponse" } } } }
    */

    router.get('/:id', validate(teamIdParamSchema), teamController.getTeamById);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Get team details by ID'
        #swagger.description = 'Retrieves detailed information for a specific team.'
        #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.responses[200] = { description: 'Team details.', content: { "application/json": { schema: { $ref: "#/components/schemas/TeamResponse" } } } }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    router.put('/:id', authenticateToken, validate(updateTeamSchema), teamController.updateTeam);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Update a team (Owner/Admin only)'
        #swagger.description = 'Updates the details of a team. Requires the user to be the team owner or an Admin.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TeamRequest" } } } }
        #swagger.responses[200] = { description: 'Team updated successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/TeamResponse" } } } }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    router.delete('/:id', authenticateToken, validate(teamIdParamSchema), teamController.deleteTeam);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Delete a team (Owner/Admin only)'
        #swagger.description = 'Deletes a team. Requires the user to be the team owner or an Admin.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.responses[200] = { description: 'Team deleted successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponseMessage" } } } }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    // --- Team Member Management ---
    router.post('/:id/members', authenticateToken, validate(addMemberSchema), teamController.addMember);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Add a member to a team (Owner/Captain only)'
        #swagger.description = 'Adds a new user to a team. Requires the user to be the team owner or captain.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AddTeamMemberRequest" } } } }
        #swagger.responses[200] = { description: 'Member added successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/TeamResponse" } } } }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' } // e.g., user already in team
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' } // Team or user not found
    */

    router.delete('/:id/members/:userId', authenticateToken, validate(removeMemberSchema), teamController.removeMember);
    /*  #swagger.tags = ['Teams']
        #swagger.summary = 'Remove a member from a team (Owner/Captain or self)'
        #swagger.description = 'Removes a member from a team. Requires the user to be the team owner/captain, or the member themselves.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.parameters['userId'] = { in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        #swagger.responses[200] = { description: 'Member removed successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/TeamResponse" } } } }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[403] = { $ref: '#/components/responses/ForbiddenError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' } // Team or member not found
    */

    return router;
};
