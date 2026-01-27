//const { connectQueue } = require("../config/rabbbitmq");
const amqp = require('amqplib');

let channel = null;

// Connect to RabbitMQ
async function connectQueue() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();

        // Create the Queue (if it doesn't exist)
        await channel.assertQueue('orders_queue', { durable: true });

        console.log('Connected to RabbitMQ');

    } catch (error) {
        console.log('RabbitMQ Error: ', error);
    }
}

// "Publish" Function
async function sendToQueue(orderData) {
    if(!channel) await connectQueue();

    channel.sendToQueue(
        'orders_queue',
        Buffer.from(JSON.stringify(orderData)),
        { presistent: true }
    );

    console.log(`Sent to queue: Order for ${orderData.userId}`);
}

module.exports = { sendToQueue , connectQueue };