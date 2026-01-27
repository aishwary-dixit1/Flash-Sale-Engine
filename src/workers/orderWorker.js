const amqp = require('amqplib');
const { Query } = require('mongoose');

async function startOrderWorker() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const QUEUE_NAME = 'orders_queue';

        // Ensure the queue exists
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Prefetch(1) ensures the worker handles one order at a time (fairness)
        channel.prefetch(1);

        console.log('Order Worker started. Waiting for Orders...');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const orderData = JSON.parse(msg.content.toString());

                console.log(`Processing Order for: ${orderData.userId}`);

                // --- SIMULATE DATABASE WRITE ---
                // await Order.create(orderData);
                // We Simulate a 1-second delay for database operations
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log(`Order SAVED to DB for: ${orderData.userId}`);

                // Acknowledge the message
                channel.ack(msg);
            }
        })
    } catch (error) {
        console.error('Order Worker Error: ', error);
    }
}

startOrderWorker();