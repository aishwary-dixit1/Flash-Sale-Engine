const redis = require("../config/redis");

// The Lua Script for Atomic Locking
/**
 * LUA SCRIPT V2: WITH IDEMPOTENCY
 * KEYS[1] = productKey (e.g., "item:123")
 * KEYS[2] = idempotencyKey (e.g., "req_user1_timestamp")
 * ARGV[1] = quantity (e.g., 1)
 */
const luaScript = `
local productKey = KEYS[1]
local idempotencyKey = KEYS[2]
local quantityToBuy = tonumber(ARGV[1])

-- 1. CHECK IDEMPOTENCY: Did we already process this specific request ID?
local existingOrder = redis.call('get', idempotencyKey)

if existingOrder then
    return 2 -- CODE 2: "Already Processed" (Don't deduct stock again)
end

-- 2. CHECK STOCK
local currentStock = tonumber(redis.call('get', productKey) or 0)

if currentStock >= quantityToBuy then
    -- 3. DEDUCT STOCK
    redis.call('decrby', productKey, quantityToBuy)

    -- 4. SAVE IDEMPOTENCY KEY (Expire in 10 minutes to save money)
    -- We mark this ID as "DONE"
    redis.call('set', idempotencyKey, "DONE", 'EX', 600)
    
    return 1 -- CODE 1: "SUCCESS"
else 
    return 0 -- CODE 0: "Out of Stock"
end
`

// Load the script once
redis.defineCommand('buyItem', {
    numberOfKeys: 2,
    lua: luaScript
});

async function reserveItem(productId, quantity, requestId) 
{
    if (!requestId) {
        throw new Error("Idempotency Key is required!");
    }
    return await redis.buyItem(productId, requestId, quantity);
}

module.exports = { reserveItem };