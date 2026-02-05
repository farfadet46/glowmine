// player.js
import { TILE, SPAWN_X, SPAWN_Y } from './config.js';
import { getTile } from './world.js';
import { soundManager } from './audio.js';
import { landingParticles } from './particles.js';
import { keys } from './input.js';
import { checkItemPickup } from './itemsDrop.js';
import { floatingBubbles } from './particles.js';

export const player = {
    x: SPAWN_X,
    y: SPAWN_Y,
    w: 24,
    h: 24,
    vx: 0,
    vy: 0,
    acc: 0.8,
    friction: 0.85,
    gravity: 0.5,
    jump: -10,
    grounded: false,
    wasGrounded: true,
    scaleX: 1,
    scaleY: 1,
    targetScaleX: 1,
    targetScaleY: 1,
    squashEffect: 0,
    jumpSquash: 0
};

export function updatePlayer(dt = 1) {
    player.wasGrounded = player.grounded;

    if (keys['KeyA'] || keys['ArrowLeft']) player.vx -= player.acc * dt;
    if (keys['KeyD'] || keys['ArrowRight']) player.vx += player.acc * dt;

    if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && player.grounded) {
        player.vy = player.jump;
        player.grounded = false;
        soundManager.playJump();
        player.targetScaleX = 1.3;
        player.targetScaleY = 0.7;
        player.jumpSquash = 10;
    }

    player.vx *= Math.pow(player.friction, dt);
    player.vy += player.gravity * dt;

    player.x += player.vx * dt;
    collideX();
    player.y += player.vy * dt;
    collideY();

    const picked = checkItemPickup(player.x, player.y, player.w, player.h);
    if (picked) {
        import('./inventory.js').then(({ addItem }) => {
            addItem(picked.type, picked.amount);
        });
        floatingBubbles.push({
            text: `+${picked.amount} ${picked.type}`,
            x: player.x + player.w / 2 - 10,
            y: player.y - 10,
            alpha: 1,
            lifetime: 45
        });
        soundManager.playPickup();
    }

    updateVisualEffects(dt);
}

function updateVisualEffects(dt = 1) {
    // ← CORRECTION: utiliser Math.max pour éviter les valeurs négatives
    player.squashEffect = Math.max(0, player.squashEffect - dt);
    player.jumpSquash = Math.max(0, player.jumpSquash - dt);

    // ← CORRECTION: vérifier <= 0 au lieu de === 0
    if (player.squashEffect <= 0 && player.jumpSquash <= 0) {
        player.targetScaleX = 1;
        player.targetScaleY = 1;
    }

    // ← CORRECTION: réinitialiser si les deux sont à 0
    if (player.squashEffect <= 0 && player.jumpSquash <= 0 && player.targetScaleX !== 1) {
        player.targetScaleX = 1;
        player.targetScaleY = 1;
    }

    player.scaleX += (player.targetScaleX - player.scaleX) * 0.3;
    player.scaleY += (player.targetScaleY - player.scaleY) * 0.3;
}

function collideX() {
    const l = Math.floor(player.x / TILE);
    const r = Math.floor((player.x + player.w) / TILE);
    const t = Math.floor(player.y / TILE);
    const b = Math.floor((player.y + player.h - 1) / TILE);

    for (let y = t; y <= b; y++) {
        if (player.vx > 0 && getTile(r, y) !== 0) {
            player.x = r * TILE - player.w;
            player.vx = 0;
        }
        if (player.vx < 0 && getTile(l, y) !== 0) {
            player.x = (l + 1) * TILE;
            player.vx = 0;
        }
    }
}

function collideY() {
    const l = Math.floor(player.x / TILE);
    const r = Math.floor((player.x + player.w - 1) / TILE);
    const t = Math.floor(player.y / TILE);
    const b = Math.floor((player.y + player.h) / TILE);

    for (let x = l; x <= r; x++) {
        if (player.vy > 0 && getTile(x, b) !== 0) {
            const wasFalling = !player.grounded && player.vy > 5;
            
            player.y = b * TILE - player.h;
            player.vy = 0;
            player.grounded = true;
            
            if (wasFalling) onPlayerLanded();
            return;
        }
        
        if (player.vy < 0 && getTile(x, t) !== 0) {
            player.y = (t + 1) * TILE;
            player.vy = 0;
        }
    }

    if (player.grounded && player.vy > 0) {
        player.grounded = false;
    }
}

function onPlayerLanded() {
    player.targetScaleX = 1.4;
    player.targetScaleY = 0.6;
    player.squashEffect = 15;
    soundManager.playLand();

    for (let i = 0; i < 8; i++) {
        landingParticles.push({
            x: player.x + Math.random() * player.w,
            y: player.y + player.h - 2,
            alpha: 1,
            lifetime: 20,
            vy: -Math.random() * 3 - 2,
            vx: (Math.random() - 0.5) * 4,
            color: '#999',
            size: Math.random() * 1.5 + 1.5,
            gravity: 0.2,
            type: 'landing'
        });
    }
}
