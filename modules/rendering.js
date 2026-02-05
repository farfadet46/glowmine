// rendering.js
import { TILE } from './config.js';
import { player } from './player.js';
import { world, getTile } from './world.js';
import { monsterManager } from './monsters.js';
import { torchPos } from './main.js';
import { mining } from './mining.js';
import { landingParticles, miningParticles, floatingBubbles } from './particles.js';
import { SPAWN_X, SPAWN_Y } from './config.js';
import { groundLoot } from './main.js';
import { droppedItems, itemColor } from './itemsDrop.js';
import { getDelta } from './main.js';

export function draw(ctx, canvas) {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;
    ctx.save();
    ctx.translate(-camX, -camY);

    const xs = Math.floor(camX / TILE) - 1;
    const ys = Math.floor(camY / TILE) - 1;
    const xe = xs + Math.ceil(canvas.width / TILE) + 2;
    const ye = ys + Math.ceil(canvas.height / TILE) + 2;

    for (let y = ys; y < ye; y++) {
        for (let x = xs; x < xe; x++) {
            const t = getTile(x, y);
            if (t !== 0) {
                switch (t) {
                    case 1: ctx.fillStyle = '#654'; break;
                    case 2:
                        ctx.fillStyle = '#333';
                        ctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
                        ctx.fillStyle = '#0ff';
                        ctx.fillRect(x * TILE + 10, y * TILE + 10, 12, 12);
                        continue;
                    case 3: ctx.fillStyle = '#888'; break;
                    case 4:
                        ctx.fillStyle = '#654';
                        ctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
                        ctx.fillStyle = '#2a2a2a';
                        ctx.fillRect(x * TILE + 6, y * TILE + 6, 20, 20);
                        continue;
                    case 5: ctx.fillStyle = '#542'; break;
                    case 6: ctx.fillStyle = '#7a7'; break;
                    case 7: ctx.fillStyle = '#654'; break;
                }
                ctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
            }
        }
    }

    ctx.fillStyle = '#0ff';
    ctx.globalAlpha = 1;
    ctx.fillRect(SPAWN_X + 8, SPAWN_Y - 28, 16, 60);
    ctx.fillRect(SPAWN_X, SPAWN_Y + 8, 32, 6);
    ctx.fillRect(SPAWN_X, SPAWN_Y + 16, 32, 6);
    ctx.fillRect(SPAWN_X, SPAWN_Y + 24, 32, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText('SPAWN', SPAWN_X - 16, SPAWN_Y - 32);

    if (mining && mining.active) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(mining.gx * TILE, mining.gy * TILE, TILE, TILE);
        ctx.fillStyle = 'rgba(0,255,255,0.5)';
        const h = TILE * (mining.progress / mining.required);
        ctx.fillRect(mining.gx * TILE, mining.gy * TILE + TILE - h, TILE, h);
    }

    torchPos.forEach(t => {
        ctx.fillStyle = '#f90';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    monsterManager.draw(ctx);

    ctx.fillStyle = '#aaa';
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.scale(player.scaleX || 1, player.scaleY || 1);
    ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();

    const dt = getDelta();
    updateAndDrawParticles(ctx, dt);

    ctx.restore();

    const lc = document.createElement('canvas');
    lc.width = canvas.width;
    lc.height = canvas.height;
    const l = lc.getContext('2d');
    l.fillStyle = 'rgba(0,0,0,1)';
    l.fillRect(0, 0, lc.width, lc.height);
    l.globalCompositeOperation = 'destination-out';

    drawLight(l, (SPAWN_X + player.w / 2) - camX, (SPAWN_Y + player.h / 2) - camY, 5 * TILE);
    drawLight(l, canvas.width / 2, canvas.height / 2, 90);
    torchPos.forEach(t => drawLight(l, t.x - camX, t.y - camY, 180));
    monsterManager.monsters.forEach(m => drawLight(l, (m.x + m.w / 2) - camX, (m.y + m.h / 2) - camY, m.lightRadius));

    ctx.drawImage(lc, 0, 0);

    groundLoot.forEach(l => {
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(l.qty.toString(), l.x - 4, l.y + 12);
    });

    floatingBubbles.forEach((b, i) => {
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const padding = 6;
        const textWidth = ctx.measureText(b.text).width;
        ctx.fillStyle = 'rgba(240,240,240,0.9)';
        ctx.fillRect(b.x - 4, b.y - 12, textWidth + padding * 2, 24);
        ctx.fillStyle = '#000';
        ctx.fillText(b.text, b.x + padding, b.y);
        b.y -= 0.3 * dt;
        b.lifetime -= dt;
        b.alpha = b.lifetime / 60;
        if (b.lifetime <= 0) floatingBubbles.splice(i, 1);
    });

    droppedItems.forEach(d => {
        const sx = d.x - camX;
        const sy = d.y - camY;
        ctx.save();
        ctx.fillStyle = itemColor(d.type);
        ctx.fillRect(sx - 6, sy - 6, 12, 12);
        ctx.restore();
    });

    groundLoot.forEach(l => {
        if (l.grounded) {
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(l.qty.toString(), l.x - 4, l.y + 12);
        } else {
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    drawMinimap(ctx, canvas, camX, camY);
}

function updateAndDrawParticles(ctx, dt) {
    for (let i = landingParticles.length - 1; i >= 0; i--) {
        const p = landingParticles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
        p.alpha = Math.pow(0.97, dt);
        p.lifetime -= dt;

        if (p.lifetime <= 0 || p.alpha < 0.01) {
            landingParticles.splice(i, 1);
        }
    }

    for (let i = miningParticles.length - 1; i >= 0; i--) {
        const p = miningParticles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
        p.alpha = Math.pow(0.97, dt);
        p.lifetime -= dt;

        if (p.lifetime <= 0 || p.alpha < 0.01) {
            miningParticles.splice(i, 1);
        }
    }
}

export function drawLight(ctx, x, y, radius) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

export function drawMinimap(ctx, canvas, camX, camY) {
    const miniCanvas = document.getElementById('debugMinimap');
    if (!miniCanvas) return;
    const miniCtx = miniCanvas.getContext('2d');
    miniCtx.fillStyle = '#000';
    miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

    const scale = 2;
    const centerX = miniCanvas.width / 2;
    const centerY = miniCanvas.height / 2;

    for (let id in world) {
        let [gx, gy] = id.split(',').map(Number);
        let type = world[id];
        if (type === 0) continue;
        let rx = (gx - Math.floor(player.x / TILE)) * scale + centerX;
        let ry = (gy - Math.floor(player.y / TILE)) * scale + centerY;
        if (rx >= 0 && rx < miniCanvas.width && ry >= 0 && ry < miniCanvas.height) {
            miniCtx.fillStyle = (type === 2) ? '#0ff' : '#555';
            miniCtx.fillRect(rx, ry, scale, scale);
        }
    }

    monsterManager.monsters.forEach(m => {
        let mx = (m.x - player.x) / TILE * scale + centerX;
        let my = (m.y - player.y) / TILE * scale + centerY;
        miniCtx.fillStyle = '#f00';
        miniCtx.fillRect(mx - 1, my - 1, 3, 3);
    });

    droppedItems.forEach(d => {
        let dx = (d.x - player.x) / TILE * scale + centerX;
        let dy = (d.y - player.y) / TILE * scale + centerY;
        miniCtx.fillStyle = '#FF00FF';
        miniCtx.fillRect(dx - 1, dy - 1, 3, 3);
    });
    
    miniCtx.fillStyle = '#fff';
    miniCtx.fillRect(centerX - 1, centerY - 1, 3, 3);
    miniCtx.strokeStyle = '#0ff';
    miniCtx.strokeRect(0, 0, miniCanvas.width, miniCanvas.height);
}
