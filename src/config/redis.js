const Redis = require("ioredis");

//Connect to Redis
const redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6380
});

redisClient.on('connect', () => {
    console.log('Redis connected successfully');
});

redisClient.on('error', (error) => {
    console.log("Redis connection error: ", error)
});

module.exports = redisClient;