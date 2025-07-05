// src/infrastructure/database/repositories/postgres.match.repository.js
const MatchRepositoryInterface = require('../../../domain/tournament/match.repository.interface');
// Match entity and MatchStatus might be needed for domain logic or type hints if not solely relying on model's toDomainEntity
// const { Match, MatchStatus } = require('../../../domain/tournament/match.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
// Models will be injected or imported from a central place.
// Removed direct model definition, sequelize, DataTypes, Model imports

/**
 * @implements {MatchRepositoryInterface}
 */
class PostgresMatchRepository extends MatchRepositoryInterface {
    /**
     * @param {object} models - An object containing the Sequelize models.
     * @param {import('sequelize').ModelCtor<import('sequelize').Model>} models.MatchModel
     * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.TournamentModel] - Optional, if needed for specific queries involving tournament details directly
     */
    constructor(models) {
        super();
        if (!models || !models.MatchModel) {
            throw new Error('Required models (MatchModel) not provided to PostgresMatchRepository');
        }
        this.MatchModel = models.MatchModel;
        // this.TournamentModel = models.TournamentModel; // If needed for includes
        this.sequelize = models.MatchModel.sequelize; // Get sequelize instance from the model
        this.Op = this.sequelize.Op; // Get Op from sequelize instance
    }

    async create(matchEntity, options = {}) {
        try {
            const matchData = { ...matchEntity };
            // The Match entity should align with model attributes or have a toPersistenceMap method
            // Example: if entity has 'roundNumber' and model 'round'
            // matchData.round = matchEntity.roundNumber; delete matchData.roundNumber;
            if (matchEntity.id) matchData.id = matchEntity.id;
            else delete matchData.id;

            const matchModelInstance = await this.MatchModel.create(matchData, { transaction: options.transaction });
            return matchModelInstance.toDomainEntity();
        } catch (error) {
            // Add more context to error, like the data that failed
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating match: ${error.message} (Data: ${JSON.stringify(matchEntity)})`);
        }
    }

    async createBulk(matchEntities, options = {}) {
        try {
            const matchDataArray = matchEntities.map(entity => {
                const data = { ...entity };
                 // Similar mapping as in `create` if necessary
                if (!entity.id) delete data.id;
                return data;
            });
            // Ensure 'returning: true' if you need to get IDs or other default values back for all created records,
            // though toDomainEntity might not need it if IDs are pre-generated (UUIDs)
            const matchModelInstances = await this.MatchModel.bulkCreate(matchDataArray, { transaction: options.transaction, returning: true });
            return matchModelInstances.map(model => model.toDomainEntity());
        } catch (error) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error bulk creating matches: ${error.message}`);
        }
    }

    async findById(matchId, options = {}) {
        try {
            const includeOptions = [];
            // Example: if (options.includeTournament && this.TournamentModel) {
            //   includeOptions.push({ model: this.TournamentModel, as: 'tournament' });
            // }
            const matchModelInstance = await this.MatchModel.findByPk(matchId, {
                transaction: options.transaction,
                include: includeOptions
                });
            return matchModelInstance ? matchModelInstance.toDomainEntity() : null;
        } catch (error) {
            // console.error(`Error in PostgresMatchRepository.findById: ${error.message}`, error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding match by ID: ${error.message}`);
        }
    }

    async updateById(matchId, updateData, options = {}) {
        try {
            const modelUpdateData = { ...updateData };
            const [updateCount] = await this.MatchModel.update(modelUpdateData, {
                where: { id: matchId },
                transaction: options.transaction,
                returning: false,
            });

            if (updateCount === 0) {
                const exists = await this.MatchModel.findByPk(matchId, { transaction: options.transaction, attributes: ['id'] });
                return exists ? this.findById(matchId, { transaction: options.transaction }) : null;
            }
            return this.findById(matchId, { transaction: options.transaction });
        } catch (error) {
            if (error instanceof ApiError) throw error;
            // console.error(`Error in PostgresMatchRepository.updateById: ${error.message}`, error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating match: ${error.message}`);
        }
    }

    async deleteById(matchId, options = {}) {
        try {
            const deleteCount = await this.MatchModel.destroy({
                where: { id: matchId },
                transaction: options.transaction,
            });
            return deleteCount > 0;
        } catch (error) {
            // console.error(`Error in PostgresMatchRepository.deleteById: ${error.message}`, error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error deleting match: ${error.message}`);
        }
    }

    async findByTournamentId(tournamentId, options = {}) {
        try {
            const whereClause = { tournamentId };
            if (options.round !== undefined) whereClause.roundNumber = options.round; // Align with model field name
            if (options.status) whereClause.status = options.status;

            const matches = await this.MatchModel.findAll({
                where: whereClause,
                order: [['roundNumber', 'ASC'], ['matchNumberInRound', 'ASC'], ['createdAt', 'ASC']], // Align with model field name
                transaction: options.transaction,
            });
            return matches.map(model => model.toDomainEntity());
        } catch (error) {
            // console.error(`Error in PostgresMatchRepository.findByTournamentId: ${error.message}`, error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding matches by tournament ID: ${error.message}`);
        }
    }

    async findByParticipantId(participantId, options = {}) {
        const whereClause = {
            [this.Op.or]: [ // Use this.Op
                { participant1Id: participantId },
                { participant2Id: participantId }
            ]
        };
        if (options.status) whereClause.status = options.status;
        if (options.tournamentId) whereClause.tournamentId = options.tournamentId;


        const findOptions = {
            where: whereClause,
            order: [['scheduledTime', 'DESC'], ['createdAt', 'DESC']],
            transaction: options.transaction,
        };
        if (options.limit !== undefined) findOptions.limit = options.limit;
        if (options.offset !== undefined) findOptions.offset = options.offset;

        try {
            const matches = await this.MatchModel.findAll(findOptions);
            return matches.map(model => model.toDomainEntity());
        } catch (error) {
            // console.error(`Error in PostgresMatchRepository.findByParticipantId: ${error.message}`, error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding matches by participant ID: ${error.message}`);
        }
    }
}

// Module exports only the repository class. Models are now managed centrally.
module.exports = {
    PostgresMatchRepository
};
