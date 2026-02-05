// monsters.js
import { soundManager } from './audio.js';
import { TILE } from './config.js';
import { getTile } from './world.js';
import { player } from './player.js';
import { landingParticles } from './particles.js';
import { groundLoot } from './main.js';

export const MONSTER_TYPES = {
    basic: { name: "SLIME", hp: 3, speed: 1, damage: 1, hasGravity: true, color: '#f0f', spawnChance: 0.003, lightRadius: 40 },
    fast: { name: "BAT", hp: 2, speed: 2.5, damage: 1, hasGravity: false, color: '#66f', spawnChance: 0.002, lightRadius: 60 },
    tank: { name: "GOLEM", hp: 8, speed: 0.5, damage: 2, hasGravity: true, color: '#888', spawnChance: 0.001, lightRadius: 60 },
    flying: { name: "SPIRIT", hp: 4, speed: 1.5, damage: 1, hasGravity: false, color: '#0ff', spawnChance: 0.0015, lightRadius: 30 }
};

export class Monster {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
        this.type = type;
        const config = MONSTER_TYPES[type];
        this.maxHp = config.hp;
        this.hp = this.maxHp;
        this.speed = config.speed;
        this.damage = config.damage;
        this.hasGravity = config.hasGravity;
        this.color = config.color;
        this.name = config.name;
        this.lightRadius = config.lightRadius;
        this.vx = 0;
        this.vy = 0;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.changeDirectionTimer = 0;
        this.damageCooldown = 0;
        this.alive = true;
        this.targetX = x;
        this.blinkTimer = 0;
    }

    update(dt = 1) {
        if (!this.alive) return;
        this.updateBehavior(dt);
        this.updatePhysics(dt);
        this.updateTimers(dt);
    }

    updateBehavior(dt = 1) {
        this.changeDirectionTimer -= dt;
        if (this.changeDirectionTimer <= 0) {
            this.direction = Math.random() < 0.5 ? -1 : 1;
            this.targetX = this.x + (this.direction * (50 + Math.random() * 100));
            this.changeDirectionTimer = 60 + Math.random() * 120;
        }
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 2) this.vx = Math.sign(dx) * this.speed;
        else this.vx = 0;
    }

    updatePhysics(dt = 1) {
        if (this.hasGravity) {
            const groundY = Math.floor((this.y + this.h) / TILE);
            const leftTile = Math.floor(this.x / TILE);
            const rightTile = Math.floor((this.x + this.w - 1) / TILE);
            if (getTile(leftTile, groundY) === 0 && getTile(rightTile, groundY) === 0) {
                this.vy += 0.5 * dt;
            } else {
                this.vy = 0;
                this.y = groundY * TILE - this.h;
            }
        } else {
            this.vy = Math.sin(Date.now() * 0.002) * 0.5;
        }

        let nextX = this.x + this.vx * dt;
        const leftWall = Math.floor(nextX / TILE);
        const rightWall = Math.floor((nextX + this.w) / TILE);
        for (let ty = Math.floor(this.y / TILE); ty <= Math.floor((this.y + this.h - 1) / TILE); ty++) {
            if (getTile(leftWall, ty) !== 0 || getTile(rightWall, ty) !== 0) {
                this.vx = 0;
                this.direction *= -1;
                this.targetX = this.x;
                break;
            }
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    updateTimers(dt = 1) {
        if (this.damageCooldown > 0) this.damageCooldown -= dt;
        if (this.blinkTimer > 0) this.blinkTimer -= dt;
    }

    takeDamage(damage = 1) {
        if (this.damageCooldown > 0 || !this.alive) return false;
        this.hp -= damage;
        this.damageCooldown = 30;
        this.blinkTimer = 15;
        this.vx = (player.x > this.x ? -1 : 1) * 3;
        this.x += this.vx;
        if (this.hp <= 0) {
            this.alive = false;
            this.onDeath();
            return true;
        }
        return false;
    }

    onDeath() {
        soundManager.playMonsterDie();
        const base = 2;
        const bonus = Math.floor(Math.random() * 3);
        const qty = base + bonus;
        this.dropGroundLoot(qty);

        for (let i = 0; i < 20; i++) {
            landingParticles.push({
                x: this.x + Math.random() * this.w,
                y: this.y + Math.random() * this.h,
                alpha: 1,
                lifetime: 30,
                vy: -Math.random() * 5 - 2,
                vx: (Math.random() - 0.5) * 6,
                color: this.color,
                size: Math.random() * 4 + 2,
                gravity: 0.15,
                type: 'death'
            });
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(this.x + 4, this.y + 6, 8, 8);
        ctx.fillRect(this.x + 20, this.y + 6, 8, 8);
        ctx.fillStyle = "#000";
        ctx.fillRect(this.x, this.y - 15, this.w, 8);
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(this.x, this.y - 15, (this.hp / this.maxHp) * this.w, 8);
    }

    dropGroundLoot(qty) {
        groundLoot.push({
            x: player.x - 10,
            y: player.y - 20,
            type: 'essence',
            qty: qty,
            lifetime: 300,
            vy: 0,
            grounded: false
        });
    }
}

function isValidSpawnLocation(x, y, type) {
    const config = MONSTER_TYPES[type];
    const tileX = Math.floor(x / TILE);
    let tileY = Math.floor(y / TILE);
    if (getTile(tileX, tileY) !== 0) return null;
    if (config.hasGravity) {
        let groundY = tileY + 1;
        let foundGround = false;
        while (groundY < 50) {
            if (getTile(tileX, groundY) !== 0) {
                foundGround = true;
                y = groundY * TILE - 32;
                break;
            }
            groundY++;
        }
        if (!foundGround) return null;
    }
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
            if (getTile(tileX + dx, tileY + dy) !== 0) return null;
        }
    }
    return { x, y };
}

export class MonsterManager {
    constructor() {
        this.monsters = [];
        this.maxMonsters = 10;
    }

    spawnMonster(x, y, type = null) {
        if (this.monsters.length >= this.maxMonsters) return null;
        if (!type) {
            const types = Object.keys(MONSTER_TYPES);
            const weights = types.map(t => MONSTER_TYPES[t].spawnChance);
            type = this.weightedRandom(types, weights);
        }
        const monster = new Monster(x, y, type);
        this.monsters.push(monster);
        return monster;
    }

    weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[0];
    }

    update(dt = 1) {
        this.monsters.forEach(monster => monster.update(dt));
        this.monsters = this.monsters.filter(monster => monster.alive);
    }

    draw(ctx) {
        this.monsters.forEach(m => m.draw(ctx));
    }

    tryAutoSpawn() {
        if (this.monsters.length >= this.maxMonsters) return;
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const spawnX = player.x + (Math.random() < 0.5 ? -150 : 150) + (Math.random() - 0.5) * 100;
            let groundTileY = Math.floor(player.y / TILE);
            while (groundTileY < 50 && getTile(Math.floor(spawnX / TILE), groundTileY) !== 0) groundTileY++;
            const spawnY = groundTileY * TILE - 32;
            const types = Object.keys(MONSTER_TYPES);
            const weights = types.map(t => MONSTER_TYPES[t].spawnChance);
            const type = this.weightedRandom(types, weights);
            const valid = isValidSpawnLocation(spawnX, spawnY, type);
            if (valid) {
                this.spawnMonster(valid.x, valid.y, type);
                return;
            }
            attempts++;
        }
    }

    debugSpawnAbovePlayer() {
        const spawnX = player.x + 3;
        const spawnY = player.y;
        const monster = this.spawnMonster(spawnX, spawnY, 'basic');
        if (monster) {
            console.log("✅ Monster spawned at:", monster.x, monster.y);
            for (let i = 0; i < 40; i++) {
                landingParticles.push({
                    x: monster.x + Math.random() * 32,
                    y: monster.y + Math.random() * 32,
                    alpha: 1,
                    lifetime: 60,
                    vy: -Math.random() * 8 - 4,
                    vx: (Math.random() - 0.5) * 15,
                    color: '#ff0',
                    size: Math.random() * 12 + 8,
                    gravity: 0.1,
                    type: 'spawn'
                });
            }
        }
    }
}

export const monsterManager = new MonsterManager();
