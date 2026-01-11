const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  hallOfResidence: { type: String, required: true },

  // Rating fields
  bullet: { type: Number, default: 1200 },
  blitz: { type: Number, default: 1200 },
  rapid: { type: Number, default: 1200 },
  puzzles: { type: Number, default: 1200 },

  // Stats
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },

  gameHistory: [
    {
      gameId: String,
      opponentUserId: String,
      opponentUsername: String,
      result: String, // 'won', 'lost', 'draw'
      ratingChange: Number,
      timeControl: String,
      termination: String,
      playedAt: Date,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
