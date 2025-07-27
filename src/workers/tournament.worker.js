const cron = require('node-cron');
const { TournamentService } = require('../application/tournament/tournament.service');
const { WalletService } = require('../application/wallet/wallet.service');
const { TournamentRepository } = require('../infrastructure/database/repositories/tournament.repository');
const { UserRepository } = require('../infrastructure/database/repositories/user.repository');
const { WalletRepository } = require('../infrastructure/database/repositories/wallet.repository');
const { a } = require('../infrastructure/database/repositories/wallet.repository');

const tournamentRepository = new TournamentRepository();
const userRepository = new UserRepository();
const walletRepository = new WalletRepository();

const tournamentService = new TournamentService(tournamentRepository, userRepository);
const walletService = new WalletService(walletRepository);

// Schedule a task to run every minute to check for tournaments to start or cancel
cron.schedule('* * * * *', async () => {
  console.log('Running tournament worker...');
  const upcomingTournaments = await tournamentService.getUpcomingTournaments();

  for (const tournament of upcomingTournaments) {
    if (new Date() >= tournament.startDate) {
      try {
        if (tournament.currentParticipants >= tournament.minParticipants) {
          await tournamentService.startTournament(tournament.id);
          console.log(`Tournament ${tournament.name} has started.`);
          // Here you would implement the logic to send the match ID and entry code to the participants
        } else {
          await tournamentService.cancelTournament(tournament.id);
          console.log(`Tournament ${tournament.name} has been canceled due to lack of participants.`);
          // Refund the entry fee to all participants
          const participants = await tournamentService.getTournamentParticipants(tournament.id);
          for (const participant of participants) {
            await walletService.deposit(participant.userId, tournament.entryFee, 'Tournament refund');
          }
        }
      } catch (error) {
        console.error(`Error processing tournament ${tournament.id}:`, error);
      }
    }
  }
});
