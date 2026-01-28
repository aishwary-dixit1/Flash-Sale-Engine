const request = require('supertest');
const app = require('../src/app');
const redis = require('../src/config/redis');

// Timeout for stress testing
jest.setTimeout(60000);

describe(' Flash Sale System Performance Test', () => {
    const TOTAL_REQUESTS = 10000; // The "Load"
    const PRODUCT_ID = 'test_metric_item';

    beforeAll(async () => {
        // 1. Setup Stock (2000 items, enough for everyone)
        await redis.set(PRODUCT_ID, 20000);
        
        // 2. Clear Rate Limits (Safety measure)
        const keys = await redis.keys('ratelimit:*');
        if (keys.length > 0) await redis.del(keys);
        
        console.log(`\n STARTING STRESS TEST: ${TOTAL_REQUESTS} Concurrent Requests...`);
    });

    afterAll(async () => {
        // Wait 1 second for RabbitMQ to finish sending/receiving
        await new Promise(resolve => setTimeout(resolve, 1000));
        await redis.quit(); // Close connection
    });

    test(`Should handle ${TOTAL_REQUESTS} requests and calculate TPS`, async () => {
        // A. Generate 1000 unique requests
        // NOTE: We use unique User IDs so the Rate Limiter doesn't block us!
        const requests = [];
        for (let i = 0; i < TOTAL_REQUESTS; i++) {
            requests.push({
                userId: `load_user_${i}`, 
                productId: PRODUCT_ID,
                quantity: 1,
                requestId: `req_${i}_${Date.now()}`
            });
        }

        // B. Start Timer 
        const startTime = process.hrtime();

        // C. Fire All Requests in Parallel (The "Thundering Herd")
        const responses = await Promise.all(
            requests.map(data => request(app).post('/order').send(data))
        );

        // D. Stop Timer 
        const endTime = process.hrtime(startTime);

        // E. Calculate Metrics
        const durationSeconds = endTime[0] + (endTime[1] / 1e9);
        const tps = TOTAL_REQUESTS / durationSeconds;
        const avgLatency = (durationSeconds * 1000) / TOTAL_REQUESTS;
        const successCount = responses.filter(r => r.statusCode === 200).length;

        // F.  PRINT TEST STATS
        console.log('\n================================================');
        console.log('        FINAL TEST METRICS        ');
        console.log('================================================');
        console.log(` Requests Handled:   ${TOTAL_REQUESTS}`);
        console.log(`  Total Time:         ${durationSeconds.toFixed(3)}s`);
        console.log(` Throughput (TPS):   ${tps.toFixed(2)} req/sec`);
        console.log(` Average Latency:    ${avgLatency.toFixed(2)} ms`);
        console.log(` Successful Orders:  ${successCount}`);
        console.log('================================================\n');

        // G. Assertions (Pass/Fail)
        expect(successCount).toBe(TOTAL_REQUESTS);
        
        // Verify Stock in Redis
        const finalStock = await redis.get(PRODUCT_ID);
        expect(Number(finalStock)).toBe(20000 - TOTAL_REQUESTS);
    });
});