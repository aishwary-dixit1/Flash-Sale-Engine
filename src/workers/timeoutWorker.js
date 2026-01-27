const amqp = require('amqplib');
const Redis = require('ioredis');

const redis = new Redis();

async function startTimeoutWorker() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const QUEUE_NAME = 'order_cancel_queue'; // Listening to the DLX queue

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('Timeout Worker started...');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const orderData = JSON.parse(msg.content.toString());

                console.log(`Timeout received for Order: ${orderData.userId}`);

                // --- CHECK DATABASE HERE ---
                // const order = await Order.findById(orderData.orderId);
                // if order.status === 'PAID', ignore this message.
                // if order.status === 'PENDING', cancel it and restock.

                // For the demo, we assume they always failed to pay.

                console.log(`Restocking item: ${orderData.productId}`);

                // Atomic Increment (Put the stock back)
                await redis.incrby(orderData.productId, orderData.quantity);

                const newStock = await redis.get(orderData.productId);
                console.log(`Item Restocked. New Stock: ${newStock}`);

                channel.ack(msg);
            }
        })
    } catch (error) {
        console.log('Timeout Worker Error: ', error);
    }
}

startTimeoutWorker();