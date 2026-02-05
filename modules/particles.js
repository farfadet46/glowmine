// particles.js
import { TILE } from './config.js';

export let landingParticles = [];
export let floatingBubbles = [];
export let miningParticles = [];

export function addLandingParticle(p) {
    landingParticles.push(p);
}

export function addMiningParticle(m) {
    landingParticles.push(m);
}

export function addFloatingBubble(b) {
    floatingBubbles.push(b);
}

export function createMiningParticles(x, y, tileType) {
    const colors = {
        1: ['#876', '#765', '#654'],
        2: ['#0ff', '#6ff', '#4dd'],
        3: ['#aaa', '#999', '#888'],
        4: ['#222', '#333', '#444'],
        5: ['#542', '#431', '#320'],
        6: ['#7a7', '#6a6', '#5a5']
    };

    const particleColors = colors[tileType] || colors[1];
    const count = 8 + Math.floor(Math.random() * 4);
    
    //console.log(`[MINING] ${count} particules créées en (${x}, ${y})`);

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        landingParticles.push({
            x: x * TILE + TILE / 2 + (Math.random() - 0.5) * TILE / 2,
            y: y * TILE + TILE / 2 + (Math.random() - 0.5) * TILE / 2,
            alpha: 1,
            lifetime: 25 + Math.random() * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            color: particleColors[Math.floor(Math.random() * particleColors.length)],
            size: Math.random() * 2 + 2,
            gravity: 0.12,
            type: 'mining'
        });
    }
}