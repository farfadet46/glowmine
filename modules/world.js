// world.js
import { hash } from './utils.js';
import { SEED } from './config.js';

export let world = {};

export function getTile(x, y) {
    const id = x + ',' + y;
    if (world[id] !== undefined) return world[id];

    if (y === -1) {
        world[id] = 0;
        generateTreeAt(x, y);
        return world[id];
    }
    if (y < 0) return world[id] = 0;

    const r = Math.random();
    if (r < 0.15) return world[id] = 4;
    if (r < 0.20) return world[id] = 2;
    if (y > 10 && r < 0.35) return world[id] = 3;
    if (inCave(x, y)) return world[id] = 0;
    return world[id] = 1;
}

function generateTreeAt(x, y) {
    if (y !== -1) return false;
    if (hash(x, 999, SEED) < 0.12) {
        const treeHeight = 4 + Math.floor(hash(x, 1000, SEED) * 3);
        for (let i = 0; i < treeHeight; i++) world[x + ',' + (y - i)] = 5;

        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -3; dy < 0; dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) {
                    const leafX = x + dx;
                    const leafY = y - treeHeight + 1 + dy;
                    if (!world[leafX + ',' + leafY]) world[leafX + ',' + leafY] = 6;
                }
            }
        }
        return true;
    }
    return false;
}

function inCave(x, y) {
    const caveSeed = SEED;
    const xx = Math.floor(x / 8);
    const yy = Math.floor(y / 8);
    if (hash(xx + caveSeed, yy + caveSeed, SEED) < 0.50 && y > 10) {
        const cx = xx * 8 + Math.floor(hash(xx + 1, yy + 2, SEED) * 8);
        const cy = (yy + 1) * 8 + Math.floor(hash(xx + 3, yy + 4, SEED) * 8);
        const r = 3 + hash(xx + 5, yy + 6, SEED) * 3;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r * r) return true;
    }
    if (hash(xx + caveSeed + 100, yy + caveSeed + 100, SEED) < 0.50 && y > 20) {
        const cx = xx * 8 + Math.floor(hash(xx + 7, yy + 8, SEED) * 8);
        const cy = (yy + 2) * 8 + Math.floor(hash(xx + 9, yy + 10, SEED) * 8);
        const r = 6 + hash(xx + 11, yy + 12, SEED) * 4;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
}
