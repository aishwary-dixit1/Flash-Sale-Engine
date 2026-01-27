const redis = require('../config/redis');

const WINDOW_SIZE_IN_SECONDS = 10; // Time window
const MAX_REQUESTS = 5; // Limit (e.g., 5 requests per window)

async function isRateLimited(userId) {
    const Key = `ratelimit:${userId}`;

    // 1. Increment the counter for this user
    // redis.incr(key) returns the NEW value (1, 2, 3...)
    const currentCount = await redis.incr(Key);

    // 2. If this is the FIRST request, start the timer
    if (currentCount === 1) {
        await redis.expire(Key, WINDOW_SIZE_IN_SECONDS);
    }

    // 3. Check if they exceeded the limit
    if (currentCount > MAX_REQUESTS) {
        return true; // Yes, they are limited (Blocked)
    }

    return false; // No, let them pass
}

module.exports = { isRateLimited };