// inventory.js
import { MAX_STACK_SIZE } from './config.js';

export let inv = {
    ores: 0, torches: 25, dirt: 5, rock: 5, coal: 0, wood: 0, leaves: 0, essence: 0, chest: 1
};

export const chest = {
    slots: new Array(16).fill(null),
    open: false
};

export function addItem(itemId, amount = 1) {
    const current = inv[itemId] || 0;
    const newTotal = current + amount;
    if (newTotal > MAX_STACK_SIZE) {
        inv[itemId] = MAX_STACK_SIZE;
        return newTotal - MAX_STACK_SIZE;
    } else {
        inv[itemId] = newTotal;
        return 0;
    }
}

export function addItemToChest(index, item, amount = 1) {
    const current = chest.slots[index] ? chest.slots[index].count : 0;
    const newTotal = current + amount;
    if (newTotal > MAX_STACK_SIZE) {
        chest.slots[index] = { ...item, count: MAX_STACK_SIZE };
        return newTotal - MAX_STACK_SIZE;
    } else {
        chest.slots[index] = { ...item, count: newTotal };
        return 0;
    }
}
