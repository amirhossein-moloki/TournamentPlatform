const logger = require('../../../utils/logger');
// const TournamentRepository = require('../../../infrastructure/database/repositories/postgres.tournament.repository'); // Conceptual
// const { TournamentStatus } = require('../../../domain/tournament/tournament.entity'); // Conceptual

// const tournamentRepository = new TournamentRepository(); // Conceptual

/**
 * Registers tournament-related event handlers for a connected socket.
 * This handler would be responsible for things like:
 * - Allowing users to subscribe to updates for specific tournaments/matches.
 * - Broadcasting tournament status changes (e.g., REGISTRATION_OPEN -> ONGOING).
 * - Broadcasting live bracket updates (match starts, scores change, winner declared).
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - The individual client socket.
 * @param {Map<string, { userId: string, username: string, rooms: Set<string> }>} activeSockets - Map of active sockets.
 */
function registerTournamentHandlers(io, socket, activeSockets) {
  const userId = socket.user.id;
  logger.info(`[TournamentHandler] Setting up for user ${userId} (socket ${socket.id})`);

  /**
   * Example: Client subscribes to updates for a specific tournament.
   * The client would send this event after navigating to a tournament page.
   */
  socket.on('subscribeToTournamentUpdates', async (payload, callback) => {
    try {
      // Payload: { tournamentId: string }
      const { tournamentId } = payload;
      if (!tournamentId || typeof tournamentId !== 'string') {
        if (typeof callback === 'function') callback({ success: false, error: 'Invalid tournamentId provided.' });
        return;
      }

      // TODO: Authorization - Check if user is allowed to view this tournament or if it's public.
      // const tournament = await tournamentRepository.findById(tournamentId);
      // if (!tournament) {
      //   if (typeof callback === 'function') callback({ success: false, error: 'Tournament not found.' });
      //   return;
      // }

      const roomName = `tournament:${tournamentId}`;
      await socket.join(roomName);
      const activeSocketInfo = activeSockets.get(socket.id);
      if (activeSocketInfo) {
        activeSocketInfo.rooms.add(roomName);
      }

      logger.info(`[TournamentHandler] User ${userId} subscribed to updates for tournament ${tournamentId} (joined room ${roomName}).`);
      if (typeof callback === 'function') callback({ success: true, message: `Subscribed to tournament ${tournamentId}.` });

      // Optionally, send current state of the tournament/bracket upon subscription
      // socket.emit('tournamentState', { tournamentId, /* current bracket data, status, etc. */ });

    } catch (err) {
      logger.error(`[TournamentHandler] Error in subscribeToTournamentUpdates for user ${userId}, tournament ${payload?.tournamentId}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: 'Server error subscribing to tournament.' });
    }
  });

  /**
   * Example: Client unsubscribes from tournament updates.
   */
  socket.on('unsubscribeFromTournamentUpdates', async (payload, callback) => {
    try {
      // Payload: { tournamentId: string }
      const { tournamentId } = payload;
      if (!tournamentId || typeof tournamentId !== 'string') {
        if (typeof callback === 'function') callback({ success: false, error: 'Invalid tournamentId provided.' });
        return;
      }

      const roomName = `tournament:${tournamentId}`;
      await socket.leave(roomName);
      const activeSocketInfo = activeSockets.get(socket.id);
      if (activeSocketInfo) {
        activeSocketInfo.rooms.delete(roomName);
      }

      logger.info(`[TournamentHandler] User ${userId} unsubscribed from updates for tournament ${tournamentId}.`);
      if (typeof callback === 'function') callback({ success: true, message: `Unsubscribed from tournament ${tournamentId}.` });

    } catch (err)
    {
      logger.error(`[TournamentHandler] Error in unsubscribeFromTournamentUpdates for user ${userId}, tournament ${payload?.tournamentId}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: 'Server error unsubscribing from tournament.' });
    }
  });


  // Server-side logic to broadcast updates would be triggered by domain events or use case completions.
  // For example, after a match result is submitted and confirmed:
  //
  // function broadcastBracketUpdate(tournamentId, updatedMatchData, nextMatchData = null) {
  //   const roomName = `tournament:${tournamentId}`;
  //   const payload = {
  //     type: 'MATCH_UPDATE',
  //     tournamentId,
  //     match: updatedMatchData, // DTO of the updated match
  //     nextMatch: nextMatchData, // DTO of the next match affected, if any
  //   };
  //   io.to(roomName).emit('bracketUpdate', payload);
  //   logger.info(`[TournamentHandler] Broadcasted bracket update for tournament ${tournamentId} to room ${roomName}.`);
  // }
  // This broadcastBracketUpdate function would be called from, e.g., ResolveDisputeUseCase or a MatchResultConfirmedUseCase.

  // Another example: Tournament status change
  // function broadcastTournamentStatusChange(tournamentId, newStatus) {
  //   const roomName = `tournament:${tournamentId}`;
  //   io.to(roomName).emit('tournamentStatusUpdate', { tournamentId, status: newStatus });
  //   logger.info(`[TournamentHandler] Broadcasted status update for tournament ${tournamentId} to ${newStatus}.`);
  // }
  // This would be called from use cases like StartTournamentUseCase, CloseRegistrationUseCase, etc.

}

module.exports = registerTournamentHandlers;

// Notes:
// - This handler manages subscriptions to tournament-specific updates.
// - Clients join/leave rooms named like `tournament:<tournamentId>`.
// - Actual broadcasting of `bracketUpdate` or `tournamentStatusUpdate` events
//   would be initiated from the application layer (use cases or domain event subscribers)
//   when relevant changes occur (e.g., match result confirmed, tournament starts).
//   These broadcast functions would use the `io` instance.
// - Authorization for subscribing to a tournament (e.g., is it public, or participant-only for some updates)
//   is marked as a TODO.
// - This structure allows targeted real-time updates for specific tournaments.
// - The `activeSockets` map is used to track which rooms a socket has joined, useful for cleanup on disconnect.
// - For more complex real-time interactions (e.g., live score reporting by participants within a match room),
//   additional events and rooms (e.g., `match:<matchId>`) would be needed.
// - This is a foundational setup for tournament-related real-time features.
