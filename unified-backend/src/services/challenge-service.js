const FriendlyChallengeRepository = require('../repositories/FriendlyChallengeRepository');
const FriendRepository = require('../repositories/FriendRepository');
const UserRepository = require('../repositories/UserRepository');
const GameService = require('./game-service');
const { emitToUser } = require('./socket-service');

class ChallengeService {
    /**
     * Send a friendly challenge
     */
    static async sendChallenge(challengerId, challengedId, timeControlKey) {
        // Validate not self-challenge
        if (challengerId === challengedId) {
            throw new Error('Cannot challenge yourself');
        }

        // Check if users are friends
        const areFriends = await FriendRepository.areFriends(challengerId, challengedId);
        if (!areFriends) {
            throw new Error('You can only challenge friends');
        }

        // Validate time control
        const { TIME_CONTROLS } = require('./matchmaking-service');
        if (!TIME_CONTROLS[timeControlKey]) {
            throw new Error('Invalid time control');
        }

        // Check if there's already a pending challenge
        const hasPending = await FriendlyChallengeRepository.hasPendingChallenge(challengerId, challengedId);
        if (hasPending) {
            throw new Error('A challenge is already pending between you');
        }

        // Create challenge
        const challenge = await FriendlyChallengeRepository.createChallenge(challengerId, challengedId, timeControlKey);

        // Get challenger info for notification
        const challenger = await UserRepository.findByUserId(challengerId, false);

        // Notify challenged user
        emitToUser(challengedId, 'challenge_received', {
            challengeId: challenge.id,
            challenger: {
                userId: challenger.userId,
                username: challenger.username,
                rating: challenger[timeControlKey]
            },
            timeControl: timeControlKey,
            expiresAt: challenge.expiresAt
        });

        return challenge;
    }

    /**
     * Accept a challenge
     */
    static async acceptChallenge(challengeId, userId) {
        const challenge = await FriendlyChallengeRepository.getChallengeById(challengeId);

        if (!challenge) {
            throw new Error('Challenge not found');
        }

        // Verify authorization (only the challenged user can accept)
        if (challenge.challengedId !== userId) {
            throw new Error('Not authorized to accept this challenge');
        }

        // Verify status
        if (challenge.status !== 'pending') {
            throw new Error('Challenge is no longer pending');
        }

        // Check expiry
        if (new Date() > new Date(challenge.expiresAt)) {
            await FriendlyChallengeRepository.updateStatus(challengeId, 'expired');
            throw new Error('Challenge has expired');
        }

        const { TIME_CONTROLS } = require('./matchmaking-service');
        const timeControl = TIME_CONTROLS[challenge.timeControlKey];

        if (!timeControl) {
            throw new Error('Invalid time control configuration');
        }

        // Create the game using GameService
        const game = await GameService.createGame({
            whitePlayerId: challenge.challengerId, // Challenger plays white
            blackPlayerId: challenge.challengedId,
            timeControlKey: challenge.timeControlKey,
            timeControl, // Pass the timeControl object
            isFriendly: true
        });

        // Update challenge status
        await FriendlyChallengeRepository.updateStatus(challengeId, 'accepted', game.gameId);

        // Notify both players
        emitToUser(challenge.challengerId, 'challenge_accepted', {
            challengeId,
            gameId: game.gameId
        });

        return {
            success: true,
            gameId: game.gameId
        };
    }

    /**
     * Decline a challenge
     */
    static async declineChallenge(challengeId, userId) {
        const challenge = await FriendlyChallengeRepository.getChallengeById(challengeId);

        if (!challenge) {
            throw new Error('Challenge not found');
        }

        if (challenge.challengedId !== userId) {
            throw new Error('Not authorized to decline this challenge');
        }

        if (challenge.status !== 'pending') {
            throw new Error('Challenge is no longer pending');
        }

        // Update status
        await FriendlyChallengeRepository.updateStatus(challengeId, 'declined');

        // Notify challenger
        emitToUser(challenge.challengerId, 'challenge_declined', {
            challengeId
        });

        return { success: true };
    }

    /**
     * Get pending challenges
     */
    static async getPendingChallenges(userId) {
        return await FriendlyChallengeRepository.getPendingChallenges(userId);
    }
}

module.exports = ChallengeService;
