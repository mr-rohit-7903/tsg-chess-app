const FriendRepository = require('../repositories/FriendRepository');
const FriendRequestRepository = require('../repositories/FriendRequestRepository');
const UserRepository = require('../repositories/UserRepository');
const { emitToUser } = require('./socket-service');

class FriendService {
    /**
     * Send a friend request
     */
    static async sendFriendRequest(senderId, receiverId) {
        // Validate not self-request
        if (senderId === receiverId) {
            throw new Error('Cannot send friend request to yourself');
        }

        // Check if receiver exists
        const receiver = await UserRepository.findByUserId(receiverId, false);
        if (!receiver) {
            throw new Error('User not found');
        }

        // Check if already friends
        const areFriends = await FriendRepository.areFriends(senderId, receiverId);
        if (areFriends) {
            throw new Error('Already friends with this user');
        }

        // Check if there's already a pending request
        const hasPending = await FriendRequestRepository.hasPendingRequest(senderId, receiverId);
        if (hasPending) {
            throw new Error('Friend request already pending');
        }

        // Create the request
        const request = await FriendRequestRepository.createRequest(senderId, receiverId);

        // Get sender info for notification
        const sender = await UserRepository.findByUserId(senderId, false);

        // Notify receiver via WebSocket
        emitToUser(receiverId, 'friend_request_received', {
            requestId: request.id,
            sender: {
                userId: sender.userId,
                username: sender.username,
            }
        });

        return request;
    }

    /**
     * Accept a friend request
     */
    static async acceptFriendRequest(requestId, userId) {
        const request = await FriendRequestRepository.getRequestById(requestId);

        if (!request) {
            throw new Error('Friend request not found');
        }

        if (request.receiverId !== userId) {
            throw new Error('Not authorized to accept this request');
        }

        if (request.status !== 'pending') {
            throw new Error('Request is no longer pending');
        }

        // Update request status
        await FriendRequestRepository.updateStatus(requestId, 'accepted');

        // Create friendship
        await FriendRepository.addFriend(request.senderId, request.receiverId);

        // Get user info for notifications
        const accepter = await UserRepository.findByUserId(userId, false);
        const sender = await UserRepository.findByUserId(request.senderId, false);

        // Notify sender that request was accepted
        emitToUser(request.senderId, 'friend_request_accepted', {
            requestId,
            friend: {
                userId: accepter.userId,
                username: accepter.username,
            }
        });

        return {
            success: true,
            friend: {
                userId: sender.userId,
                username: sender.username,
            }
        };
    }

    /**
     * Decline a friend request
     */
    static async declineFriendRequest(requestId, userId) {
        const request = await FriendRequestRepository.getRequestById(requestId);

        if (!request) {
            throw new Error('Friend request not found');
        }

        if (request.receiverId !== userId) {
            throw new Error('Not authorized to decline this request');
        }

        if (request.status !== 'pending') {
            throw new Error('Request is no longer pending');
        }

        // Update request status
        await FriendRequestRepository.updateStatus(requestId, 'declined');

        // Notify sender
        emitToUser(request.senderId, 'friend_request_declined', {
            requestId,
        });

        return { success: true };
    }

    /**
     * Remove a friend
     */
    static async removeFriend(userId, friendId) {
        const areFriends = await FriendRepository.areFriends(userId, friendId);
        if (!areFriends) {
            throw new Error('Not friends with this user');
        }

        await FriendRepository.removeFriend(userId, friendId);
        return { success: true };
    }

    /**
     * Get user's friends list
     */
    static async getFriends(userId) {
        return await FriendRepository.getFriends(userId);
    }

    /**
     * Get pending friend requests
     */
    static async getPendingRequests(userId) {
        return await FriendRequestRepository.getPendingRequests(userId);
    }

    /**
     * Get sent friend requests
     */
    static async getSentRequests(userId) {
        return await FriendRequestRepository.getSentRequests(userId);
    }

    /**
     * Search users to add as friends
     */
    static async searchUsers(query, currentUserId) {
        const users = await UserRepository.searchByUsername(query);

        // Filter out current user and get friendship status
        const results = [];
        for (const user of users) {
            if (user.userId === currentUserId) continue;

            const isFriend = await FriendRepository.areFriends(currentUserId, user.userId);
            const hasPending = await FriendRequestRepository.hasPendingRequest(currentUserId, user.userId);

            results.push({
                userId: user.userId,
                username: user.username,
                isFriend,
                hasPendingRequest: hasPending,
                ratings: user.ratings || {
                    bullet: 1200,
                    blitz: 1200,
                    rapid: 1200,
                }
            });
        }

        return results;
    }
}

module.exports = FriendService;
