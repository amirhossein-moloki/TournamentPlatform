// src/infrastructure/database/models/idempotencyRequest.model.js
const { DataTypes, Model } = require('sequelize');

// Define Enum for status if not already globally available
const IdempotencyStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING', // Optional: if there's a distinct processing phase after pending before completion/failure
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

class IdempotencyRequestModel extends Model {
  // No toDomainEntity for now, as this is primarily an infrastructure concern record.
  // If a domain concept of an "IdempotentOperation" emerges, this could map to it.

  static associate(models) {
    // An idempotency request belongs to a user
    this.belongsTo(models.UserModel, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

module.exports = (sequelize) => {
  IdempotencyRequestModel.init({
    idempotencyKey: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: { model: 'Users', key: 'id' } // Defined in models/index.js
    },
    requestPath: { // e.g., 'POST /wallet/deposit'
      type: DataTypes.STRING,
      allowNull: false,
    },
    // requestHash could be added if key + path + userId is not unique enough for some reason
    // requestHash: {
    //   type: DataTypes.STRING,
    //   allowNull: true, // Or false if always generated
    // },
    status: {
      type: DataTypes.ENUM(...Object.values(IdempotencyStatus)),
      allowNull: false,
      defaultValue: IdempotencyStatus.PENDING,
    },
    responseStatusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseBody: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // lockedAt might be useful for preventing concurrent processing of the same key
    // This can be managed by the service logic (e.g., trying to update status from PENDING to PROCESSING)
    // lockedAt: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    // },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    failedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    }
    // createdAt and updatedAt are automatically added by Sequelize (timestamps: true)
  }, {
    sequelize,
    modelName: 'IdempotencyRequest',
    tableName: 'IdempotencyRequests',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      // idempotencyKey is already PK, so indexed and unique.
    ],
  });

  // Expose the enum for use in repository/service if needed
  IdempotencyRequestModel.Status = IdempotencyStatus;

  return IdempotencyRequestModel;
};
