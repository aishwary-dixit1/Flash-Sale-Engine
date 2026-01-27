const { isRateLimited } = require("../services/rateLimiter");
const redis = require("../config/redis");

const delay = ms => new Promise(res => setTimeout(res, ms));

async function simulateSpamAttack() {
    const USER_ID = 'spammer_bot_999';

    // Clear previous tests
    await redis.del(`ratelimit:${USER_ID}`);

    console.log(`Starting Rate Limit Test for ${USER_ID}`);
    console.log(`Limit: 5 requests / 10 seconds`);

    // Simulate 10 rapid-fire requests
    for (let i = 1; i <= 20; i++) {

        if (i === 11) {
            await delay(10000);
        }


        const limited = await isRateLimited(USER_ID);

        if (limited) {
            console.log(`Request ${i}: BLOCKED (Too many requests)`);
        } else {
            console.log(`Request ${i}: ALLOWED`);
        }
    }

    console.log("\n Test Complete.");

    process.exit();
}

simulateSpamAttack();