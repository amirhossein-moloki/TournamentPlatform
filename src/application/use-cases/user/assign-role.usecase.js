class AssignRoleUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ userId, role }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.addRole(role);

    return this.userRepository.update(user);
  }
}

module.exports = AssignRoleUseCase;
