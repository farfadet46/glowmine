// itemsDrop.js
import { TILE } from "./config.js";
import { getTile } from "./world.js";

export const droppedItems = [];

export function spawnItemDrop(type, x, y, amount = 1) {
    console.log('DROP', type, x, y); 
    droppedItems.push({
        type,
        x: x,
        y: y,
        amount,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        alpha: 1,
        lifetime: 300,
        grounded: false,
        collected: false
    });
}

export function updateItemDrops(dt = 1) {
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const drop = droppedItems[i];
        if (drop.collected) {
            droppedItems.splice(i, 1);
            continue;
        }

        if (!drop.grounded) {
            drop.vy += 0.5 * dt;
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;
            drop.vx *= Math.pow(0.99, dt);
        } else {
            drop.vx *= Math.pow(0.85, dt);
            drop.x += drop.vx * dt;
        }

        const dropRadius = 6;
        const bottomX = drop.x;
        const bottomY = drop.y + dropRadius;
        const tileX = Math.floor(bottomX / TILE);
        const tileY = Math.floor(bottomY / TILE);
        
        if (getTile(tileX, tileY) !== 0) {
            if (!drop.grounded) {
                drop.grounded = true;
                drop.y = tileY * TILE - dropRadius;
                drop.vy = 0;
                if (Math.abs(drop.vy) > 2) {
                    drop.vy = -drop.vy * 0.3;
                    drop.grounded = false;
                }
            } else {
                drop.y = tileY * TILE - dropRadius;
                drop.vy = 0;
            }
        } else {
            drop.grounded = false;
        }

        const topX = drop.x;
        const topY = drop.y - dropRadius;
        const topTileX = Math.floor(topX / TILE);
        const topTileY = Math.floor(topY / TILE);
        
        if (getTile(topTileX, topTileY) !== 0) {
            drop.vy = Math.abs(drop.vy) * 0.5;
            drop.y = (topTileY + 1) * TILE + dropRadius;
        }

        if (Math.abs(drop.vx) > 0.1) {
            const leftX = drop.x - dropRadius;
            const leftTileX = Math.floor(leftX / TILE);
            const leftTileY = Math.floor(drop.y / TILE);
            if (getTile(leftTileX, leftTileY) !== 0) {
                drop.vx = Math.abs(drop.vx) * 0.5;
                drop.x = (leftTileX + 1) * TILE + dropRadius;
            }
            
            const rightX = drop.x + dropRadius;
            const rightTileX = Math.floor(rightX / TILE);
            const rightTileY = Math.floor(drop.y / TILE);
            if (getTile(rightTileX, rightTileY) !== 0) {
                drop.vx = -Math.abs(drop.vx) * 0.5;
                drop.x = rightTileX * TILE - dropRadius;
            }
        }

        if (drop.grounded && Math.abs(drop.vx) < 0.01) {
            drop.vx = 0;
        }

        drop.lifetime -= dt;
        if (drop.lifetime <= 0) {
            drop.alpha -= 0.02 * dt;
        }
        if (drop.alpha <= 0) droppedItems.splice(i, 1);
    }
}

export function drawItemDrops(ctx, camX, camY) {
    if (!ctx) return;
    for (const drop of droppedItems) {
        const sx = drop.x - camX;
        const sy = drop.y - camY;
        
        ctx.save();
        ctx.globalAlpha = drop.alpha;
        ctx.fillStyle = itemColor(drop.type);
        
        const size = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx - size/2 + 2, sy - size/2 + 2, size, size);
        ctx.fillStyle = itemColor(drop.type);
        ctx.fillRect(sx - size/2, sy - size/2, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - size/2, sy - size/2, size, size);
        
        ctx.restore();
    }
}

export function itemColor(type) {
    const map = {
        dirt: '#C19A6B',    // Beige/sable clair (avant: #8B4513 marron foncé)
        rock: '#708090',    // Gris ardoise
        coal: '#1C1C1C',    // Noir profond
        wood: '#8B4513',    // Marron bois (avant: #A0522D rougeâtre)
        ores: '#B8860B',    // Or foncé
        leaves: '#228B22',  // Vert forêt
        chest: '#D2691E',   // Orange terne
        essence: '#00FFFF'  // Cyan brillant
    };
    return map[type] || '#FFFFFF';
}

export function checkItemPickup(px, py, pw, ph) {
    const pickupRadius = 20;
    
    for (const drop of droppedItems) {
        if (drop.collected) continue;
        const playerCx = px + pw / 2;
        const playerCy = py + ph / 2;
        const dist = Math.hypot(playerCx - drop.x, playerCy - drop.y);
        
        if (dist < pickupRadius + pw / 2) {
            drop.collected = true;
            return drop;
        }
    }
    return null;
}
