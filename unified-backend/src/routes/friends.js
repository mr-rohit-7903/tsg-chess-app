const express = require('express');
const router = express.Router();
const FriendService = require('../services/friend-service');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Get user's friends list
router.get('/', async (req, res) => {
    try {
        const friends = await FriendService.getFriends(req.user.userId);
        res.json(friends);
    } catch (error) {
        console.error('Error getting friends:', error);
        res.status(500).json({ error: 'Failed to get friends list' });
    }
});

// Search users to add
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const results = await FriendService.searchUsers(q, req.user.userId);
        res.json(results);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Send friend request
router.post('/request', async (req, res) => {
    try {
        const { receiverId } = req.body;
        if (!receiverId) {
            return res.status(400).json({ error: 'Receiver ID required' });
        }

        const request = await FriendService.sendFriendRequest(req.user.userId, receiverId);
        res.status(201).json(request);
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(400).json({ error: error.message || 'Failed to send request' });
    }
});

// Get pending friend requests (received)
router.get('/requests/pending', async (req, res) => {
    try {
        const requests = await FriendService.getPendingRequests(req.user.userId);
        res.json(requests);
    } catch (error) {
        console.error('Error getting pending requests:', error);
        res.status(500).json({ error: 'Failed to get pending requests' });
    }
});

// Get sent friend requests
router.get('/requests/sent', async (req, res) => {
    try {
        const requests = await FriendService.getSentRequests(req.user.userId);
        res.json(requests);
    } catch (error) {
        console.error('Error getting sent requests:', error);
        res.status(500).json({ error: 'Failed to get sent requests' });
    }
});

// Accept friend request
router.post('/requests/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await FriendService.acceptFriendRequest(id, req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(400).json({ error: error.message || 'Failed to accept request' });
    }
});

// Decline friend request
router.post('/requests/:id/decline', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await FriendService.declineFriendRequest(id, req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Error declining request:', error);
        res.status(400).json({ error: error.message || 'Failed to decline request' });
    }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
    try {
        const { friendId } = req.params;
        await FriendService.removeFriend(req.user.userId, friendId);
        res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(400).json({ error: error.message || 'Failed to remove friend' });
    }
});

module.exports = router;
