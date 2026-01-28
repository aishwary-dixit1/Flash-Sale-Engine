const express = require('express');
const { reserveItem } = require('./services/inventoryService');
const { sendToQueue } = require('./services/queueService');
const { isRateLimited } = require('./services/rateLimiter');
const redis = require('./config/redis');

const app = express();

app.use(express.json());

// 1. ADMIN ROUTE (to setup the sale)
app.post('/admin/stock', async (req,res) => {
    const { productId, stock } = req.body;
    try {
        await redis.set(productId, stock);
        return res.json({ message: `Stock set to ${stock} fro ${productId}`});
    } catch (err) {
        return res.status(500).json({ error: err.message});
    }
});

// 2. ORDER ROUTE ( The Flash Sale Endpoint)
app.post('/order', async (req, res) => {
    const { userId, productId, quantity, requestId } = req.body; 

    // A. Rate Limiting (Middleware)
    const isLimited = await isRateLimited(userId);
    if(isLimited) {
        return res.status(429).json({error: 'Too many requests'});
    }

    try {
        // B. Atomic Reservation (Redis Lua)
        const result = await reserveItem(productId, quantity, requestId);

        if(result === 1){
            // C. Async Processing (RabbitMQ)
            await sendToQueue({ userId, productId, quantity, timestamp: Date.now() });

            return res.status(200).json({ status: 'success', message: 'Order Placed'});
        } else if (result == 2) {
            return res.status(200).json({ status: 'success', message: 'Order Already Processed (Idempotent'});
        } else {
            return res.status(409).json({ status: 'fail', message: 'Out of Stock'});
        }

    } catch (error) {
        console.log(error);

        return res.status(500).json({ error: 'Internal Server Error'});
    }
});

module.exports = app;