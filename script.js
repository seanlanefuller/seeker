/**
 * Seeker: A Journey of Wonder
 * Core Game Engine
 */

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

// Game State
const state = {
    isPlaying: false,
    score: 0,
    totalWonders: 0,
    lastTime: 0,
    camera: { x: 0, y: 0 }
};

// Player Entity
const player = {
    x: 0,
    y: 0,
    radius: 12,
    speed: 300, // pixels per second
    velocity: { x: 0, y: 0 },
    trail: []
};

// Input Handling
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false, W: false, S: false, A: false, D: false
};

// Content: The specific "Knowledge" items
const wonders = [
    { id: 1, text: "The universe is not required to be in perfect harmony with human ambition.", title: "Cosmic Truth", x: 0, y: -400, collected: false },
    { id: 2, text: "Wonder is the beginning of wisdom.", title: "Socrates", x: 400, y: 300, collected: false },
    { id: 3, text: "Look deep into nature, and then you will understand everything better.", title: "Einstein", x: -500, y: 500, collected: false },
    { id: 4, text: "We are made of starstuff.", title: "Sagan", x: 800, y: -200, collected: false },
    { id: 5, text: "The only true wisdom is in knowing you know nothing.", title: "Socrates", x: -800, y: -600, collected: false },
    { id: 6, text: "Life is not a problem to be solved, but a reality to be experienced.", title: "Kierkegaard", x: 1000, y: 800, collected: false },
    { id: 7, text: "In the depth of winter, I finally learned that within me there lay an invincible summer.", title: "Camus", x: -300, y: -900, collected: false },
    { id: 8, text: "Everything has beauty, but not everyone sees it.", title: "Confucius", x: 600, y: -700, collected: false }
];

state.totalWonders = wonders.length;

// Obstacles (Void Anomalies)
const obstacles = [];
function generateObstacles() {
    // Generate some random obstacles around the world
    let attempts = 0;
    while (obstacles.length < 20 && attempts < 1000) {
        attempts++;
        const candidate = {
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            radius: 50 + Math.random() * 100
        };

        // Check buffer distance (obstacle radius + extra space)
        const buffer = candidate.radius + 100;
        let valid = true;

        // 1. Check distance from Player Start (0,0)
        const distFromStart = Math.sqrt(candidate.x * candidate.x + candidate.y * candidate.y);
        if (distFromStart < buffer + 100) valid = false;

        // 2. Check distance from all Wonders
        if (valid) {
            for (const w of wonders) {
                const dx = candidate.x - w.x;
                const dy = candidate.y - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < buffer) {
                    valid = false;
                    break;
                }
            }
        }

        // 3. Check distance from other Obstacles (optional, prevents clumping)
        if (valid) {
            for (const o of obstacles) {
                const dx = candidate.x - o.x;
                const dy = candidate.y - o.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < candidate.radius + o.radius + 50) {
                    valid = false;
                    break;
                }
            }
        }

        if (valid) {
            obstacles.push(candidate);
        }
    }
}
generateObstacles();

// UI Elements
const ui = {
    startBtn: document.getElementById('start-btn'),
    introScreen: document.getElementById('intro-screen'),
    hud: document.getElementById('hud'),
    collectedCount: document.getElementById('collected-count'),
    totalCount: document.getElementById('total-count'),
    coordsX: document.getElementById('coords-x'),
    coordsY: document.getElementById('coords-y'),
    modalOverlay: document.getElementById('modal-overlay'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalTitle: document.getElementById('modal-title'),
    modalText: document.getElementById('modal-text'),
    victoryScreen: document.getElementById('victory-screen'),
    restartBtn: document.getElementById('restart-btn')
};

// Initialization
function init() {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    ui.startBtn.addEventListener('click', startGame);
    ui.closeModalBtn.addEventListener('click', closeModal);
    ui.restartBtn.addEventListener('click', restartGame);

    ui.totalCount.textContent = state.totalWonders;

    // Position player in center initially
    player.x = 0;
    player.y = 0;

    // Start animation loop (idle mode)
    requestAnimationFrame(loop);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startGame() {
    state.isPlaying = true;
    ui.introScreen.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    state.lastTime = performance.now();
    player.trail = [];
    audio.init(); // Initialize audio context on user gesture
}

function closeModal() {
    ui.modalOverlay.classList.add('hidden');
    state.isPlaying = true; // Resume game
    state.lastTime = performance.now(); // Reset timer to prevent huge delta
}

// Game Loop
function loop(timestamp) {
    const dt = (timestamp - state.lastTime) / 1000;
    state.lastTime = timestamp;

    if (state.isPlaying) {
        update(dt);
    }

    render();
    requestAnimationFrame(loop);
}

function update(dt) {
    // Movement Logic
    let dx = 0;
    let dy = 0;

    if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
    if (keys.ArrowDown || keys.s || keys.S) dy += 1;
    if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
    if (keys.ArrowRight || keys.d || keys.D) dx += 1;

    // Normalize diagonal movement input
    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
    }

    // Physics Constants
    const ACCELERATION = 1500;
    const FRICTION = 3.0; // Higher = tighter control, Lower = more drift

    // Apply Acceleration
    player.velocity.x += dx * ACCELERATION * dt;
    player.velocity.y += dy * ACCELERATION * dt;

    // Apply Friction (Drag)
    player.velocity.x -= player.velocity.x * FRICTION * dt;
    player.velocity.y -= player.velocity.y * FRICTION * dt;

    // Apply Velocity to Position
    player.x += player.velocity.x * dt;
    player.y += player.velocity.y * dt;

    // Add trail based on speed
    const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
    if (speed > 50) {
        player.trail.push({ x: player.x, y: player.y, age: 0 });
    }

    // Update Trails
    for (let i = player.trail.length - 1; i >= 0; i--) {
        player.trail[i].age += dt * 2; // Trail fades out
        if (player.trail[i].age > 1) {
            player.trail.splice(i, 1);
        }
    }

    // Camera follows player
    // We want the player to be in the center of the screen
    // Camera x/y represents the top-left corner of the viewport in world space? 
    // Easier: Camera represents center.
    state.camera.x = player.x;
    state.camera.y = player.y;

    // Check Collisions
    checkCollisions();

    // Update UI
    ui.coordsX.textContent = Math.round(player.x);
    ui.coordsY.textContent = Math.round(player.y);
}

function checkCollisions() {
    const collisionRadius = player.radius + 30; // Hitbox slightly larger

    // Check Wonders
    wonders.forEach(wonder => {
        if (wonder.collected) return;

        const dx = player.x - wonder.x;
        const dy = player.y - wonder.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < collisionRadius) {
            collectWonder(wonder);
        }
    });

    // Check Obstacles
    obstacles.forEach(obs => {
        const dx = player.x - obs.x;
        const dy = player.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = player.radius + obs.radius;

        if (dist < minDist) {
            // Collision! Push back
            const angle = Math.atan2(dy, dx);
            const pushOut = minDist - dist;

            player.x += Math.cos(angle) * pushOut;
            player.y += Math.sin(angle) * pushOut;

            // Optional: Slight physics bounce or friction could go here
        }
    });
}


function collectWonder(wonder) {
    wonder.collected = true;
    audio.playCollect();
    state.score++;
    ui.collectedCount.textContent = state.score;
    state.isPlaying = false; // Pause game

    ui.modalTitle.textContent = wonder.title;
    ui.modalText.textContent = wonder.text;
    ui.modalOverlay.classList.remove('hidden');

    if (state.score >= state.totalWonders) {
        // Delay victory screen slightly so they can read the last one first
        ui.closeModalBtn.onclick = () => {
            ui.modalOverlay.classList.add('hidden');
            triggerVictory();
        };
    }
}

function triggerVictory() {
    state.isPlaying = false;
    audio.playVictory();
    ui.victoryScreen.classList.remove('hidden');
    ui.hud.classList.add('hidden');
}

function restartGame() {
    // Reset State
    state.score = 0;
    player.x = 0;
    player.y = 0;
    player.trail = [];
    wonders.forEach(w => w.collected = false);

    // Reset UI
    ui.collectedCount.textContent = 0;
    ui.victoryScreen.classList.add('hidden');
    ui.hud.classList.remove('hidden');

    // Reset Modal Button behavior
    ui.closeModalBtn.onclick = closeModal;

    startGame();
}

// Rendering
function render() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate center offset
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Helper functions to translate world to screen
    const toScreenX = (worldX) => worldX - state.camera.x + cx;
    const toScreenY = (worldY) => worldY - state.camera.y + cy;

    // --- Vector Grid ---
    const gridSize = 100;
    const scrollX = state.camera.x % gridSize;
    const scrollY = state.camera.y % gridSize;

    ctx.strokeStyle = 'rgba(129, 140, 248, 0.1)'; // Faint indigo
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical Lines
    for (let x = -scrollX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }

    // Horizontal Lines
    for (let y = -scrollY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw Background Stars (Parallax optional, keeping simple for now)
    // We can draw a grid or some static markers to show movement
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = -2000; i < 2000; i += 200) {
        for (let j = -2000; j < 2000; j += 200) {
            const sx = toScreenX(i);
            const sy = toScreenY(j);
            // Only draw if on screen
            if (sx > -50 && sx < canvas.width + 50 && sy > -50 && sy < canvas.height + 50) {
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Draw Wonders
    wonders.forEach(wonder => {
        if (wonder.collected) return;

        const wx = toScreenX(wonder.x);
        const wy = toScreenY(wonder.y);

        // Culling
        if (wx < -100 || wx > canvas.width + 100 || wy < -100 || wy > canvas.height + 100) return;

        // Pulsating effect
        const pulse = 1 + Math.sin(Date.now() / 500) * 0.2;

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f59e0b';
        ctx.fillStyle = '#ffb300';
        ctx.beginPath();
        ctx.arc(wx, wy, 15 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Rings
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wx, wy, 25 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
    });

    // Draw Obstacles (Void Anomalies)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Dark semi-transparent
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Faint rim
    ctx.lineWidth = 3;

    obstacles.forEach(obs => {
        const ox = toScreenX(obs.x);
        const oy = toScreenY(obs.y);

        if (ox < -obs.radius || ox > canvas.width + obs.radius || oy < -obs.radius || oy > canvas.height + obs.radius) return;

        ctx.beginPath();
        ctx.arc(ox, oy, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Draw Player Trail
    if (player.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(player.trail[0].x), toScreenY(player.trail[0].y));
        for (let i = 1; i < player.trail.length; i++) {
            const point = player.trail[i];
            ctx.lineTo(toScreenX(point.x), toScreenY(point.y));
        }

        // Gradient trail
        const gradient = ctx.createLinearGradient(
            toScreenX(player.trail[0].x), toScreenY(player.trail[0].y),
            toScreenX(player.x), toScreenY(player.y)
        );
        gradient.addColorStop(0, `rgba(129, 140, 248, 0)`);
        gradient.addColorStop(1, `rgba(129, 140, 248, 0.5)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = player.radius;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    // Draw Player
    const px = toScreenX(player.x);
    const py = toScreenY(player.y);

    ctx.shadowBlur = 25;
    ctx.shadowColor = '#818cf8';
    ctx.fillStyle = '#c7d2fe';
    ctx.beginPath();
    ctx.arc(px, py, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Radar / Compass System ---
    let nearestDist = Infinity;
    let nearestWonder = null;

    wonders.forEach(wonder => {
        if (wonder.collected) return;
        const dx = wonder.x - player.x;
        const dy = wonder.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nearestDist) {
            nearestDist = dist;
            nearestWonder = wonder;
        }
    });

    if (nearestWonder) {
        const dx = nearestWonder.x - player.x;
        const dy = nearestWonder.y - player.y;
        const angle = Math.atan2(dy, dx);

        const radarRadius = player.radius + 30;
        const indicatorX = px + Math.cos(angle) * radarRadius;
        const indicatorY = py + Math.sin(angle) * radarRadius;

        // Draw compass arrow
        ctx.save();
        ctx.translate(indicatorX, indicatorY);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, 7);
        ctx.lineTo(-10, -7);
        ctx.closePath();

        // Pulse effect based on distance (faster pulse = closer)
        // Max distance in logic ~2000? 
        const pulseSpeed = Math.max(0.1, 1 - (nearestDist / 2000));
        const opacity = 0.4 + Math.sin(Date.now() / 200 * (1 + pulseSpeed)) * 0.3;

        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
        ctx.fill();

        ctx.restore();
    }
}

// --- Audio System ---
const audio = {
    ctx: null,
    isMuted: false,

    init() {
        if (!window.AudioContext && !window.webkitAudioContext) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.createAmbience();
    },

    createAmbience() {
        if (!this.ctx) return;
        // Deep space drone
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 55; // A1
        osc2.type = 'triangle';
        osc2.frequency.value = 58; // Detuned

        gain.gain.value = 0.05; // Very quiet

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
    },

    playCollect() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t); // A4
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.1); // Slide up to A5

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(t + 0.5);
    },

    playVictory() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // C Major Chord
        [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.05, t + 1);
            gain.gain.linearRampToValueAtTime(0, t + 4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(t + 4);
        });
    }
};

init();
