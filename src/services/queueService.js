const amqp = require('amqplib');

let channel = null;

// Connect to RabbitMQ
async function connectQueue() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();

        // 1. Standard Order Queue
        await channel.assertQueue('orders_queue', { durable: true });

        // 2. Setup The Dead Letter Exchange (DLX) Architecture
        // -------------------------------------------

        // A. The "Target" Exchnage (where expired messages go)
        const DLX_NAME = 'order_dlx';
        const DLX_KEY = 'order_timeout';
        await channel.assertExchange(DLX_NAME, 'direct', { durable: true });

        // B. The "Cleanup" Queue (The Janitor watches this)
        const CLEANUP_QUEUE = 'order_cancel_queue';
        await channel.assertQueue(CLEANUP_QUEUE, { durable: true });
        // Bind cleanup  queue to the exchange
        await channel.bindQueue(CLEANUP_QUEUE, DLX_NAME, DLX_KEY);

        // C. The "Waiting Room" Queue (Message sit here for X seconds)
        const DELAY_QUEUE = 'payment_wait_queue';
        await channel.assertQueue(DELAY_QUEUE, {
            durable: true,
            arguments: {
                'x-message-ttl': 5000, // 5 Seconds Timeout (for testing)
                'x-dead-letter-exchange': DLX_NAME, // When expired, send to DLX
                'x-dead-letter-routing-key': DLX_KEY
            }
        });

        console.log('Connected to RabbitMQ and Queues & DLX initialized');

    } catch (error) {
        console.log('RabbitMQ Error: ', error);
    }
}

// "Publish" Function
async function sendToQueue(orderData) {
    if(!channel) await connectQueue();

    // 1. Send for IMMEDIATE processing (Create order in DB)
    channel.sendToQueue(
        'orders_queue',
        Buffer.from(JSON.stringify(orderData)),
        { presistent: true }
    );

    // 2. Send for DELAYED check (The Timeout Timer)
    // This message will sit in 'payment_wait_queue' for 5 seconds
    channel.sendToQueue(
        'payment_wait_queue',
        Buffer.from(JSON.stringify(orderData)),
        { persistent: true }
    );

    console.log(`Sent order & Timeout Timer for ${orderData.userId}`);
}

module.exports = { sendToQueue , connectQueue };