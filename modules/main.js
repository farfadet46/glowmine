// main.js
import { TILE } from './config.js';
import { soundManager } from './audio.js';
import { player, updatePlayer } from './player.js';
import { monsterManager } from './monsters.js';
import { inv, addItem } from './inventory.js';
import { updateUI, closeChestUI } from './ui.js';
import { setupInput, setupMouseEvents } from './input.js';
import { draw } from './rendering.js';
import { floatingBubbles } from './particles.js';
import { landingParticles } from './particles.js';
import { getTile } from './world.js';
import { updateItemDrops, drawItemDrops } from './itemsDrop.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
window.closeChestUI = closeChestUI;

export let groundLoot = [];
export let torchPos = [];

// ==================== SYSTÈME DELTA TIME ====================
export const TARGET_FPS = 60;
export const TARGET_DELTA = 1000 / TARGET_FPS;
export const MAX_DELTA = 100;

export let deltaTime = 1;
export let rawDeltaTime = TARGET_DELTA;
export let isPaused = false;

let lastTime = performance.now();
let justResumed = false; // ← NOUVEAU: empêche les actions juste après reprise

export function getDelta() { return deltaTime; }

// ==================== POPUP PAUSE ====================
function createPausePopup() {
    let popup = document.getElementById('pausePopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'pausePopup';
        popup.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-family: monospace;
            ">
                <h1 style="font-size: 48px; margin-bottom: 20px;">⏸️ PAUSE</h1>
                <p style="font-size: 20px;">Cliquez ou appuyez sur P pour reprendre</p>
            </div>
        `;
        // ← NOUVEAU: clic sur le popup pour reprendre (pas de Espace)
        popup.addEventListener('click', togglePause);
        document.body.appendChild(popup);
    }
    return popup;
}

function showPausePopup() {
    const popup = createPausePopup();
    popup.style.display = 'flex';
}

function hidePausePopup() {
    const popup = document.getElementById('pausePopup');
    if (popup) popup.style.display = 'none';
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        showPausePopup();
        console.log('⏸️ Pause');
    } else {
        hidePausePopup();
        justResumed = true; // ← NOUVEAU: flag pour ignorer prochaine frame
        console.log('▶️ Reprise');
    }
}

// ==================== AUDIO ====================
function setupAudioActivation() {
    const activator = document.getElementById('audioActivator');
    if (!activator) return;

    async function activateAudio() {
        const success = await soundManager.initFromUserGesture();
        if (success) {
            activator.style.display = 'none';
            document.removeEventListener('click', activateAudio);
            document.removeEventListener('keydown', activateAudio);
        }
    }

    activator.addEventListener('click', activateAudio);
    document.addEventListener('click', activateAudio, { once: true });
    document.addEventListener('keydown', activateAudio, { once: true });
}
setupAudioActivation();

const volumeSlider = document.getElementById('volumeSlider');
if (volumeSlider) {
    volumeSlider.addEventListener('input', e => {
        soundManager.setVolume(e.target.value / 100);
    });
}

const craftTorche = document.getElementById('craftTorche');
if (craftTorche) {
    craftTorche.onclick = () => {
        if (inv.ores >= 3) {
            inv.ores -= 3;
            inv.torches++;
            updateUI();
            soundManager.playCraft();
            floatingBubbles.push({
                text: "+1 🔥",
                x: player.x + player.w + 10,
                y: player.y - 10,
                alpha: 1,
                lifetime: 60
            });
        }
    };
}

const playerPosDiv = document.getElementById('playerPos');
function updatePlayerPos() {
    if (playerPosDiv) {
        playerPosDiv.innerHTML = `<span>Position :</span><span>X: ${Math.floor(player.x / TILE)}</span><span>Y: ${Math.floor(player.y / TILE)}</span>`;
    }
}

function updateEssenceUI() {
    const essenceCount = document.getElementById('essence-count');
    if (essenceCount) essenceCount.textContent = inv.ores;
}
window.updateEssenceUI = updateEssenceUI;

function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.tabIndex = 0;
canvas.focus();

setupInput();
setupMouseEvents(canvas);

updateUI();
updatePlayerPos();
updateEssenceUI();

setTimeout(() => {
    monsterManager.tryAutoSpawn();
}, 3000);

// ==================== PAUSE SUR PERTE DE FOCUS ====================
document.addEventListener('visibilitychange', () => {
    if (document.hidden && !isPaused) {
        togglePause();
        console.log('⏸️ Pause (onglet caché)');
    }
});

// Pause avec la touche P (PAS Espace!)
window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') {
        togglePause();
    }
});

// ==================== BOUCLE DE JEU ====================
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    
    if (isPaused) {
        lastTime = currentTime;
        return;
    }
    
    // ← NOUVEAU: si on vient de reprendre, on attend une frame sans traiter les touches
    if (justResumed) {
        justResumed = false;
        lastTime = currentTime;
        // Réinitialiser les touches pour éviter le saut auto
        import('./input.js').then(({ keys }) => {
            keys['Space'] = false;
            keys['KeyW'] = false;
            keys['ArrowUp'] = false;
        });
        return;
    }
    
    // Calcul delta time
    rawDeltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Protection lag spikes
    if (rawDeltaTime > MAX_DELTA) rawDeltaTime = MAX_DELTA;
    
    // Multiplicateur de vitesse
    deltaTime = rawDeltaTime / TARGET_DELTA;
    
    updateGameLogic();
    draw(ctx, canvas);
}

function updateGameLogic() {
    const dt = deltaTime;
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;

    // Ramassage automatique
    for (let i = groundLoot.length - 1; i >= 0; i--) {
        const loot = groundLoot[i];
        const dx = player.x + player.w / 2 - loot.x;
        const dy = player.y + player.h / 2 - loot.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 40) {
            addItem(loot.type, loot.qty);
            updateUI();

            floatingBubbles.push({
                text: `+${loot.qty} ✨`,
                x: loot.x,
                y: loot.y - 10,
                alpha: 1,
                lifetime: 45 * dt
            });
            
            groundLoot.splice(i, 1);
            
            for (let j = 0; j < 5; j++) {
                landingParticles.push({
                    x: loot.x + (Math.random() - 0.5) * 10,
                    y: loot.y + (Math.random() - 0.5) * 10,
                    alpha: 1,
                    lifetime: 15 * dt,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 3 - 1,
                    color: '#ffea00',
                    size: Math.random() * 2 + 1,
                    gravity: 0.1,
                    type: 'pickup'
                });
            }
        }
    }
    
    // Physique des loots
    for (let i = groundLoot.length - 1; i >= 0; i--) {
        const loot = groundLoot[i];
        if (loot.grounded) continue;

        const groundY = Math.floor((loot.y + 8) / TILE);
        const tileX = Math.floor(loot.x / TILE);
        if (getTile(tileX, groundY) !== 0) {
            loot.grounded = true;
            loot.vy = 0;
            loot.y = groundY * TILE - 8;
        } else {
            loot.vy += 0.4 * dt;
            loot.y += loot.vy * dt;
        }
    }

    updateItemDrops(dt);
    drawItemDrops(ctx, camX, camY);

    for (let i = groundLoot.length - 1; i >= 0; i--) {
        groundLoot[i].lifetime -= dt;
        if (groundLoot[i].lifetime <= 0) groundLoot.splice(i, 1);
    }

    updatePlayer(dt);
    monsterManager.update(dt);
    updatePlayerPos();
    updateEssenceUI();
}

lastTime = performance.now();
requestAnimationFrame(gameLoop);
