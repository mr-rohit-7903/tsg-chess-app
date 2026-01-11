const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register
router.post('/register', async (req, res) => {
    try {
        let { username, fullName, email, password, hallOfResidence } = req.body;
        if (!username || !email || !password || !hallOfResidence) {
            return res.status(400).json({ error: 'Username, email, password, and hall of residence are required' });
        }

        // Validate username: no spaces, convert to lowercase
        if (/\s/.test(username)) {
            return res.status(400).json({ error: 'Username cannot contain spaces' });
        }
        username = username.toLowerCase();

        const existingUser = await UserRepository.findByUsernameOrEmail(username, email);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        const user = await UserRepository.create({
            userId,
            username,
            fullName,
            email,
            password: hashedPassword,
            hallOfResidence,
        });

        const token = jwt.sign({ userId, username, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({ message: 'User created', user, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const user = await UserRepository.findByUsername(username, false); // Include password for comparison
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await UserRepository.setOnline(user.userId, true);

        const token = jwt.sign(
            { userId: user.userId, username: user.username, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        delete user.password;
        res.json({ message: 'Login successful', user, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
