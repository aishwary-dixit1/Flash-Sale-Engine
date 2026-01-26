const redis = require("../config/redis");
const { reserveItem } = require("../services/inventoryService");

async function simulateFlashSale() {
    const PRODUCT_ID = 'item:123';

    // Reset Stock to 5 for the test
    await redis.set(PRODUCT_ID, 5);
    console.log('Starting Simulation. Stock : 5');

    //Simulate 10 simultaneous requests
    const requests = []
    for(let i = 0; i < 10; i++){
        requests.push(
            reserveItem(PRODUCT_ID, 1).then(result => {
                console.log(`User ${i}, ${result === 1 ? 'SUCCESS' : 'SOLD OUT'}`);
            })
        );
    }

    await Promise.all(requests);

    const finalStock = await redis.get(PRODUCT_ID);
    console.log(`Final Stock: ${finalStock}`);
    process.exit();
}

simulateFlashSale();