const redis = require("../config/redis");

// The Lua Script for Atomic Locking
const luaScript = `
local productKey = KEYS[1]
local quantityToBuy = tonumber(ARGV[1])
local currentStock = tonumber(redis.call('get', productKey) or 0)

if currentStock >= quantityToBuy then
    redis.call('decrby', productKey, quantityToBuy)
    return 1 -- SUCCESS
else 
    return 0 -- FAILURE
end
`

// Load the script once
redis.defineCommand('buyItem', {
    numberOfKeys: 1,
    lua: luaScript
});

async function reserveItem(productId, quantity) {
    return await redis.buyItem(productId, quantity)
}

module.exports = { reserveItem };