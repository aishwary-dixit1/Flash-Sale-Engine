const request = require('supertest');
const app = require('../src/app');
const redis = require('../src/config/redis');

// Increase timeout significantly for 10k requests
jest.setTimeout(120000); 

describe(' Flash Sale System 10K Stress Test', () => {
    const TOTAL_REQUESTS = 10000; 
    const BATCH_SIZE = 500; // Fire 500 requests at a time
    const PRODUCT_ID = 'stress_test_10k_item';

    beforeAll(async () => {
        // 1. Setup Stock (20k items)
        await redis.set(PRODUCT_ID, 20000);
        
        // 2. Clear Rate Limits
        const keys = await redis.keys('ratelimit:*');
        if (keys.length > 0) await redis.del(keys);
        
        console.log(`\n STARTING 10K TEST: ${TOTAL_REQUESTS} Requests (Batch Size: ${BATCH_SIZE})...`);
    });

    afterAll(async () => {
        // Wait for connections to drain
        await new Promise(resolve => setTimeout(resolve, 2000));
        await redis.quit();
    });

    test(`Should handle ${TOTAL_REQUESTS} requests via batching`, async () => {
        // A. Generate Data
        const allRequests = [];
        for (let i = 0; i < TOTAL_REQUESTS; i++) {
            allRequests.push({
                userId: `user_10k_${i}`, 
                productId: PRODUCT_ID,
                quantity: 1,
                requestId: `req_${i}_${Date.now()}`
            });
        }

        // B. Start Timer
        const startTime = process.hrtime();
        const responses = [];

        // C. Process in Batches (The Fix!)
        for (let i = 0; i < allRequests.length; i += BATCH_SIZE) {
            const batch = allRequests.slice(i, i + BATCH_SIZE);
            
            // Fire this batch in parallel
            const batchResponses = await Promise.all(
                batch.map(data => request(app).post('/order').send(data))
            );
            
            responses.push(...batchResponses);
            
            // Optional: Tiny breather for the OS (prevent ENOBUFS)
            if (i % 2000 === 0) console.log(`Processed ${i} / ${TOTAL_REQUESTS}...`);
        }

        // D. Stop Timer
        const endTime = process.hrtime(startTime);

        // E. Calculate Metrics
        const durationSeconds = endTime[0] + (endTime[1] / 1e9);
        const tps = TOTAL_REQUESTS / durationSeconds;
        const avgLatency = (durationSeconds * 1000) / TOTAL_REQUESTS;
        const successCount = responses.filter(r => r.statusCode === 200).length;
        const failCount = responses.filter(r => r.statusCode !== 200).length;

        // F. Print Stats
        console.log('\n================================================');
        console.log('        10K LOAD TEST RESULTS        ');
        console.log('================================================');
        console.log(` Requests Handled:   ${TOTAL_REQUESTS}`);
        console.log(`  Total Time:         ${durationSeconds.toFixed(3)}s`);
        console.log(` Throughput (TPS):   ${tps.toFixed(2)} req/sec`);
        console.log(` Successful Orders:  ${successCount}`);
        console.log(` Failed:             ${failCount}`);
        console.log('================================================\n');

        expect(successCount).toBe(TOTAL_REQUESTS);
        
        const finalStock = await redis.get(PRODUCT_ID);
        expect(Number(finalStock)).toBe(20000 - TOTAL_REQUESTS);
    });
});