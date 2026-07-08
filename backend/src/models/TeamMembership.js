const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true
    },
    tokenType: {
        type: String,
        enum: ['access', 'refresh'],
        default: 'refresh'
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB TTL index: auto-deletes when date passes
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to speed up finding a specific token for a user
tokenSchema.index({ userId: 1, tokenHash: 1 });

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;