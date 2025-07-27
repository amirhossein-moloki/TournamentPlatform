class RefundEntryFees {
  constructor({ tournamentParticipantRepository, walletRepository }) {
    this.tournamentParticipantRepository = tournamentParticipantRepository;
    this.walletRepository = walletRepository;
  }

  async execute(tournament) {
    if (tournament.entryFee > 0) {
      const participants = await this.tournamentParticipantRepository.findByTournamentId(tournament.id);
      for (const participant of participants) {
        const wallet = await this.walletRepository.findByUserId(participant.userId);
        if (wallet) {
          await this.walletRepository.credit(wallet.id, tournament.entryFee);
        }
      }
    }
  }
}

module.exports = RefundEntryFees;
