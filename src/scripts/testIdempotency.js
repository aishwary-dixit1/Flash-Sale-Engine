const redis = require('../config/redis');
const { reserveItem } = require('../services/inventoryService');

async function testIdempotency() {
    const PRODUCT_ID = "iPhone_17";
    const REQUEST_ID = 'req_unique_12345';

    console.log("Starting Idempotency Test...");

    // Reset Stock
    await redis.set(PRODUCT_ID, 1);
    // Clear any old idempotency keys
    await redis.del(REQUEST_ID);

    console.log("Stock is: 1");
    console.log(`User sends 3 identical requests with ID: ${REQUEST_ID}`);

    const promises = [
        reserveItem(PRODUCT_ID, 1, REQUEST_ID),
        reserveItem(PRODUCT_ID, 1, REQUEST_ID),
        reserveItem(PRODUCT_ID, 1, REQUEST_ID)
    ];

    const results = await Promise.all(promises);

    // Analyze Results
    results.forEach((res, index) => {
        if (res === 1) console.log(`Request ${index + 1}: SUCCESS (Stock deducted)`);
        if (res === 2) console.log(`Request ${index + 1}:  DUPLICATE DETECTED (Stock NOT deducted)`);
        if (res === 0) console.log(`Request ${index + 1}: FAIL (Out of stock)`);
    });

    const finalStock = await redis.get(PRODUCT_ID);
    console.log(`Final Stock in Redis: ${finalStock}`);

    if(finalStock == 0) {
        console.log("TEST PASSED: Stock only went down once!");
    } else {
        console.log("TEST FAILED: Stock mismatch");
    }

    process.exit();
}

testIdempotency();