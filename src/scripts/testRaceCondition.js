const redis = require("../config/redis");
const { reserveItem } = require("../services/inventoryService");
const { sendToQueue, connectQueue } = require("../services/queueService");


async function simulateFlashSale() {
    const PRODUCT_ID = 'item:123';

    // Open the connection before the sale starts
    console.log("Connecting to RabbitMQ...");
    await connectQueue();

    // Reset Stock to 5 for the test
    await redis.set(PRODUCT_ID, 5);
    console.log('Starting Simulation. Stock : 5');

    //Simulate 10 simultaneous requests
    const requests = []
    for(let i = 0; i < 10; i++){
        requests.push(
            reserveItem(PRODUCT_ID, 1).then(async (result) => {
                if (result === 1) {
                    console.log(`User ${i}: SUCCESS`);

                    // Successfully reserved stock, so we queue the order processing

                    await sendToQueue({
                        userId: `user_${i}`,
                        productId: PRODUCT_ID,
                        quantity: 1,
                        timestamp: Date.now()
                    });
                } else {
                    console.log(`User ${i}: SOLD OUT`);
                }
            })
        );
    }

    await Promise.all(requests);

    const finalStock = await redis.get(PRODUCT_ID);
    console.log(`Final Stock: ${finalStock}`);
    process.exit();
}

simulateFlashSale();