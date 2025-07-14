module.exports = {
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
  withTransaction: jest.fn((fn) => fn({
    commit: jest.fn(),
    rollback: jest.fn(),
  })),
};
