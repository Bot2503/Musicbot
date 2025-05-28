
const axios = require('axios');

// Thay bằng token bot của bạn trên top.gg
const TOPGG_TOKEN = process.env.TOPGG_TOKEN || 'your_topgg_token_here';

// Check if token is properly configured
if (TOPGG_TOKEN === 'your_topgg_token_here') {
    console.warn('⚠️  TOPGG_TOKEN not configured properly. Vote checking will be disabled.');
}

// Store vote cache để tránh spam API
const voteCache = new Map();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

class TopGGVoteChecker {
    static async hasVoted(userId) {
        // If token not configured properly, don't allow usage
        if (TOPGG_TOKEN === 'your_topgg_token_here') {
            return false;
        }

        // Check cache first
        const cached = voteCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.hasVoted;
        }

        try {
            // Check if user has voted on top.gg
            const response = await axios.get(
                `https://top.gg/api/bots/check?userId=${userId}`,
                {
                    headers: {
                        'Authorization': TOPGG_TOKEN
                    }
                }
            );

            const hasVoted = response.data.voted === 1;
            
            // Cache the result
            voteCache.set(userId, {
                hasVoted,
                timestamp: Date.now()
            });

            return hasVoted;
        } catch (error) {
            console.error('Top.gg API error:', error);
            // If API fails, don't allow usage (require valid token)
            return false;
        }
    }

    static clearCache(userId) {
        voteCache.delete(userId);
    }

    static getVoteUrl(botId) {
        return `https://top.gg/bot/${botId}/vote`;
    }
}

module.exports = TopGGVoteChecker;
