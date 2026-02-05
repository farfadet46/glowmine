// ui.js
import { inv, chest, addItem, addItemToChest } from './inventory.js';
import { TILE, MAX_STACK_SIZE } from './config.js';
import { getTile } from './world.js';

export let currentTool = 0;

export const HOTBAR_ITEMS = [
    { id: 'sword', icon: '🗡️', type: 'weapon' },
    { id: 'pickaxe', icon: '⛏️', type: 'tool' },
    { id: 'shovel', icon: '🪏', type: 'tool' },
    { id: 'rock', icon: '🪨', type: 'block' },
    { id: 'dirt', icon: '🟫', type: 'block' },
    { id: 'torch', icon: '🔥', type: 'tool' },
    { id: 'chest', icon: '📦', type: 'block' },
];

export function drawInventory() {
    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '';
    const items = [
        { id: 'ore', icon: '💎', count: inv.ores },
        { id: 'coal', icon: '⬛', count: inv.coal },
        { id: 'wood', icon: '🪵', count: inv.wood },
        { id: 'leaves', icon: '🍃', count: inv.leaves },
        { id: 'essence', icon: '✨', count: inv.essence }
    ];
    items.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.innerHTML = `<div class="icon">${item.icon}</div><div class="count">${Math.min(item.count, MAX_STACK_SIZE)}</div>`;
        slot.onclick = () => {
            if (item.count > 0) {
                const existing = chest.slots.findIndex(s => s && s.id === item.id && s.count < MAX_STACK_SIZE);
                const targetIndex = existing !== -1 ? existing : chest.slots.findIndex(s => !s);
                if (targetIndex !== -1) {
                    const surplus = addItemToChest(targetIndex, { id: item.id, icon: item.icon }, 1);
                    if (surplus === 0) {
                        inv[item.id === 'ore' ? 'ores' : item.id]--;
                        drawInventory();
                        drawChestGrid();
                    }
                }
            }
        };
        inventoryDiv.appendChild(slot);
    });
}

export function drawHotbar() {
    const hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    HOTBAR_ITEMS.forEach((item, i) => {
        const d = document.createElement('div');
        const isActive = HOTBAR_ITEMS[currentTool].id === item.id;
        d.className = 'slot' + (isActive ? ' active' : '');
        let count = null;
        if (item.id === 'rock') count = inv.rock;
        if (item.id === 'dirt') count = inv.dirt;
        if (item.id === 'torch') count = inv.torches;
        d.innerHTML = `<div class="icon">${item.icon}</div><div class="key">${i + 1}</div>` + (count !== null ? `<div class="count">${Math.min(count, MAX_STACK_SIZE)}</div>` : '');
        hotbar.appendChild(d);
    });
}

export function drawChestGrid() {
    const grid = document.getElementById('chestGrid');
    grid.innerHTML = '';
    chest.slots.forEach((slot, i) => {
        const d = document.createElement('div');
        d.className = 'inventory-slot';
        d.innerHTML = slot ? `<div class="icon">${slot.icon}</div><div class="count">${Math.min(slot.count, MAX_STACK_SIZE)}</div>` : '';
        d.onclick = () => transferFromChest(i);
        grid.appendChild(d);
    });
}

export function drawPlayerInventoryGrid() {
    const grid = document.getElementById('playerInventoryGrid');
    grid.innerHTML = '';
    HOTBAR_ITEMS.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        const count = inv[item.id] ?? 0;
        slot.innerHTML = `<div class="icon">${item.icon}</div>` + (count ? `<div class="count">${Math.min(count, MAX_STACK_SIZE)}</div>` : '');
        slot.onclick = () => {
            if (count > 0) {
                const existing = chest.slots.findIndex(s => s && s.id === item.id && s.count < MAX_STACK_SIZE);
                const targetIndex = existing !== -1 ? existing : chest.slots.findIndex(s => !s);
                if (targetIndex !== -1) {
                    const surplus = addItemToChest(targetIndex, { id: item.id, icon: item.icon }, 1);
                    if (surplus === 0) {
                        inv[item.id]--;
                        drawPlayerInventoryGrid();
                        drawChestGrid();
                    }
                }
            }
        };
        grid.appendChild(slot);
    });

    ['ores', 'coal', 'wood', 'leaves', 'essence'].forEach(key => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        const icon = { ores: '💎', coal: '⬛', wood: '🪵', leaves: '🍃', essence: '✨' }[key];
        slot.innerHTML = `<div class="icon">${icon}</div><div class="count">${Math.min(inv[key], MAX_STACK_SIZE)}</div>`;
        slot.onclick = () => {
            if (inv[key] > 0) {
                const existing = chest.slots.findIndex(s => s && s.id === key && s.count < MAX_STACK_SIZE);
                const targetIndex = existing !== -1 ? existing : chest.slots.findIndex(s => !s);
                if (targetIndex !== -1) {
                    const surplus = addItemToChest(targetIndex, { id: key, icon }, 1);
                    if (surplus === 0) {
                        inv[key]--;
                        drawPlayerInventoryGrid();
                        drawChestGrid();
                    }
                }
            }
        };
        grid.appendChild(slot);
    });
}

export function drawChestUI() {
    drawPlayerInventoryGrid();
    drawChestGrid();
    document.getElementById('chestUI').style.display = 'block';
}

export function closeChestUI() {
    document.getElementById('chestUI').style.display = 'none';
    chest.open = false;
}

function transferFromChest(index) {
    const item = chest.slots[index];
    if (!item) return;
    const surplus = addItem(item.id === 'ore' ? 'ores' : item.id, item.count);
    if (surplus > 0) {
        chest.slots[index] = { ...item, count: surplus };
    } else {
        chest.slots[index] = null;
    }
    drawPlayerInventoryGrid();
    drawChestGrid();
    updateUI();
}

export function findNearbyChest(px, py) {
    const radius = 2;
    const pxTile = Math.floor(px / TILE);
    const pyTile = Math.floor(py / TILE);
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const x = pxTile + dx;
            const y = pyTile + dy;
            if (getTile(x, y) === 7) {
                return { x: x * TILE, y: y * TILE };
            }
        }
    }
    return null;
}

export function updateUI() {
    drawHotbar();
    drawInventory();
}

window.addEventListener('wheel', e => {
    const toolIndexes = HOTBAR_ITEMS.map((_, idx) => idx);
    let pos = toolIndexes.indexOf(currentTool);
    pos += e.deltaY > 0 ? 1 : -1;
    if (pos < 0) pos = toolIndexes.length - 1;
    if (pos >= toolIndexes.length) pos = 0;
    currentTool = toolIndexes[pos];
    updateUI();
});

document.getElementById('hotbar').addEventListener('click', e => {
    const slot = e.target.closest('.slot');
    if (!slot) return;
    const index = [...document.getElementById('hotbar').children].indexOf(slot);
    currentTool = index;
    updateUI();
});

export function setCurrentTool(index) {
    currentTool = index;
    updateUI();
}
