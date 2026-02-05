// input.js
import { player } from './player.js';
import { monsterManager } from './monsters.js';
import { chest } from './inventory.js';
import { drawChestUI, closeChestUI, findNearbyChest, HOTBAR_ITEMS, currentTool, updateUI } from './ui.js';
import { soundManager } from './audio.js';
import { mining } from './mining.js';
import { MINING_SPEED, TILE } from './config.js';
import { inv } from './inventory.js';
import { world, getTile } from './world.js';
import { torchPos } from './main.js';
import { floatingBubbles, createMiningParticles } from './particles.js';
import { rectsOverlap } from './utils.js';
import { spawnItemDrop } from './itemsDrop.js'; // ← NOUVEAU

export const keys = {};
export let mouseX = 0;
export let mouseY = 0;
export let miningTarget = null;

let miningLoop = null;
let miningInProgress = false;
let miningPos = null;
let mouseDown = false;
let mouseUpdateLoop = null;
let clickJustHappened = false;
let lastTorchPlaceTime = 0;

// ========== CLAVIER ==========
window.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code[5]) - 1;
        if (digit >= 0 && digit < HOTBAR_ITEMS.length) {
            currentTool = digit;
            updateUI();
        }
    }

    if (e.code === 'KeyM' || e.code === 'Semicolon' || e.code === 'Comma') {
        monsterManager.debugSpawnAbovePlayer();
    }

    if (e.code === 'KeyC') {
        const chestPos = findNearbyChest(player.x, player.y);
        if (chestPos) {
            chest.open = !chest.open;
            if (chest.open) {
                chest.x = chestPos.x;
                chest.y = chestPos.y;
                drawChestUI();
            } else {
                closeChestUI();
            }
        }
    }

    if (e.code === 'KeyI') {
        player.x = 0;
        player.y = -TILE;
        player.vx = 0;
        player.vy = 0;
        for (let i = 0; i < 30; i++) {
            window.landingParticles.push({
                x: player.x + Math.random() * player.w,
                y: player.y + Math.random() * player.h,
                alpha: 1,
                lifetime: 40,
                vy: -Math.random() * 4 - 2,
                vx: (Math.random() - 0.5) * 6,
                color: '#0ff',
                size: Math.random() * 3 + 2,
                gravity: 0.1,
                type: 'spawn'
            });
        }
        soundManager.playCraft();
    }

    if (e.code === 'Escape') {
        if (chest.open) {
            closeChestUI();
            chest.open = false;
        }
    }
});

window.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// ========== SOURIS ==========
export function setupInput() {
    const canvas = document.getElementById('game');
    if (!canvas) return;

    canvas.oncontextmenu = e => e.preventDefault();

    canvas.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!mouseDown) return;
        clickJustHappened = false;

        const rect = canvas.getBoundingClientRect();
        const camX = player.x - canvas.width / 2;
        const camY = player.y - canvas.height / 2;
        const gx = Math.floor((e.clientX - rect.left + camX) / TILE);
        const gy = Math.floor((e.clientY - rect.top + camY) / TILE);

        miningTarget = { gx, gy };

        if (miningPos && (miningPos.gx !== gx || miningPos.gy !== gy)) {
            miningPos = { gx, gy };
        }
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        mouseDown = true;
        clickJustHappened = true;

        const rect = canvas.getBoundingClientRect();
        const camX = player.x - canvas.width / 2;
        const camY = player.y - canvas.height / 2;
        const gx = Math.floor((e.clientX - rect.left + camX) / TILE);
        const gy = Math.floor((e.clientY - rect.top + camY) / TILE);

        miningPos = { gx, gy };
        startMiningOrPlacing(gx, gy);
        startMouseUpdate();
    });

    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouseDown = false;
            stopMining();
            stopMouseUpdate();
        }
    });
}

// ========== MINAGE / PLACEMENT ==========
function canMine(tile, tool) {
    if ((tile === 1 || tile === 4) && tool === 'shovel') return true;
    if ((tile === 2 || tile === 3 || tile === 4 || tile === 5) && tool === 'pickaxe') return true;
    if (tile === 6 && (tool === 'pickaxe' || tool === 'shovel')) return true;
    if (tile === 7 && tool === 'pickaxe') return true;
    return false;
}

function startMiningOrPlacing(gx, gy) {
    const tool = HOTBAR_ITEMS[currentTool];
    const tileId = getTile(gx, gy);

    if (tool.id === 'sword') {
        attackMonstersAt(gx, gy);
        return;
    }

    // Poser torche
    if (tool.id === 'torch' && tileId === 0 && inv.torches > 0 && clickJustHappened) {
        const currentTime = Date.now();
        if (currentTime - lastTorchPlaceTime < 200) return;

        const hasTorch = torchPos.some(t => Math.floor(t.x / TILE) === gx && Math.floor(t.y / TILE) === gy);
        if (hasTorch) return;

        torchPos.push({ x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 });
        inv.torches--;
        updateUI();
        soundManager.playPlace();
        lastTorchPlaceTime = currentTime;
        clickJustHappened = false;
        return;
    }

    // Retirer torche
    const hasTorch = torchPos.some(t => Math.floor(t.x / TILE) === gx && Math.floor(t.y / TILE) === gy);
    if (hasTorch && tool.type === 'tool' && clickJustHappened) {
        const idx = torchPos.findIndex(t => Math.floor(t.x / TILE) === gx && Math.floor(t.y / TILE) === gy);
        torchPos.splice(idx, 1);
        inv.torches++;
        floatingBubbles.push({
            text: `+1 🔥`,
            x: player.x - 10,
            y: player.y - 20,
            alpha: 1,
            lifetime: 45
        });
        updateUI();
        soundManager.playPlace();
        clickJustHappened = false;
        return;
    }

    // Poser coffre
    if (tool.id === 'chest' && tileId === 0 && inv.chest > 0) {
        world[gx + ',' + gy] = 7;
        inv.chest--;
        updateUI();
        soundManager.playPlace();
        return;
    }

    // Poser bloc
    if (tool.type === 'block' && tileId === 0) {
        const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
        const blockRect = { x: gx * TILE, y: gy * TILE, w: TILE, h: TILE };
        if (!rectsOverlap(playerRect, blockRect)) {
            const count = inv[tool.id] || 0;
            if (count <= 0) return;
            let blockType = 1;
            if (tool.id === 'rock') blockType = 3;
            world[gx + ',' + gy] = blockType;
            inv[tool.id]--;
            updateUI();
            soundManager.playPlace();
        }
        return;
    }

    // ===== MINAGE : ENCHAÎNEMENT AUTOMATIQUE + DROPS PHYSIQUES =====
    if (tileId !== 0 && canMine(tileId, tool.id)) {
        if (miningInProgress) return;

        miningInProgress = true;
        mining.active = true;
        mining.gx = gx;
        mining.gy = gy;
        mining.tool = tool.id;
        mining.progress = 0;
        mining.required = MINING_SPEED;

        miningLoop = setInterval(() => {
            if (!mining.active || !mouseDown) {
                stopMining();
                return;
            }

            const canvas = document.getElementById('game');
            const rect = canvas.getBoundingClientRect();
            const camX = player.x - canvas.width / 2;
            const camY = player.y - canvas.height / 2;
            const currentGx = Math.floor((mouseX - rect.left + camX) / TILE);
            const currentGy = Math.floor((mouseY - rect.top + camY) / TILE);

            if (mining.gx !== currentGx || mining.gy !== currentGy) {
                mining.gx = currentGx;
                mining.gy = currentGy;
                mining.progress = 0;
            }

            const currentTileId = getTile(mining.gx, mining.gy);
            if (currentTileId === 0 || !canMine(currentTileId, tool.id)) {
                mining.progress = 0;
                return;
            }

            mining.progress++;
            if (mining.progress >= mining.required) {
                createMiningParticles(mining.gx, mining.gy, currentTileId);

                // 💥 DROP PHYSIQUE à la place de addItem()
                const dropX = mining.gx * TILE + TILE / 2;
                const dropY = mining.gy * TILE + TILE / 2;
                const drops = { 1: 'dirt', 2: 'ores', 3: 'rock', 4: 'coal', 5: 'wood', 6: 'leaves', 7: 'chest' };
                if (drops[currentTileId]) {
                    spawnItemDrop(drops[currentTileId], dropX, dropY);
                }

                world[mining.gx + ',' + mining.gy] = 0;
                updateUI();
                soundManager.playMine();

                mining.progress = 0;
            }
        }, MINING_SPEED * 0.5);
    }
}

function stopMining() {
    mining.active = false;
    miningInProgress = false;
    if (miningLoop) {
        clearInterval(miningLoop);
        miningLoop = null;
    }
}

// ========== SURVEILLANCE SOURIS EN CONTINU ==========
function startMouseUpdate() {
    if (mouseUpdateLoop) return;
    mouseUpdateLoop = setInterval(() => {
        if (!mouseDown || !miningPos) return;

        const canvas = document.getElementById('game');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const camX = player.x - canvas.width / 2;
        const camY = player.y - canvas.height / 2;
        const gx = Math.floor((mouseX - rect.left + camX) / TILE);
        const gy = Math.floor((mouseY - rect.top + camY) / TILE);

        if (miningPos.gx !== gx || miningPos.gy !== gy) {
            miningPos = { gx, gy };

            const tool = HOTBAR_ITEMS[currentTool];
            if (tool.type === 'tool' && tool.id !== 'sword' && tool.id !== 'torch') {
                if (miningInProgress) {
                    mining.gx = gx;
                    mining.gy = gy;
                }
            } else {
                stopMining();
                startMiningOrPlacing(gx, gy);
            }
        }
    }, 50);
}

function stopMouseUpdate() {
    if (mouseUpdateLoop) {
        clearInterval(mouseUpdateLoop);
        mouseUpdateLoop = null;
    }
}

export function setupMouseEvents(canvas) {
    canvas.oncontextmenu = e => e.preventDefault();

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        mouseDown = true;
        const rect = canvas.getBoundingClientRect();
        const camX = player.x - canvas.width / 2;
        const camY = player.y - canvas.height / 2;
        const gx = Math.floor((e.clientX - rect.left + camX) / TILE);
        const gy = Math.floor((e.clientY - rect.top + camY) / TILE);
        miningPos = { gx, gy };
        startMiningOrPlacing(gx, gy);
        startMouseUpdate();
    });

    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            mouseDown = false;
            stopMining();
            stopMouseUpdate();
        }
    });
}

function attackMonstersAt(gx, gy) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const tx = gx * TILE + TILE / 2;
    const ty = gy * TILE + TILE / 2;
    const dist = Math.hypot(px - tx, py - ty);

    let hit = false;
    monsterManager.monsters.forEach((m, idx) => {
        if (!m.alive) return;
        const mx = m.x + m.w / 2;
        const my = m.y + m.h / 2;
        const mdist = Math.hypot(mx - tx, my - ty);
        if (mdist < 40) {
            const died = m.takeDamage(1);
            hit = true;
        }
    });

    if (hit) {
        soundManager.playHit();
    }
}