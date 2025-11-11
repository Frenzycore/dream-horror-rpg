// ========== GAME CONFIGURATION ==========
const CONFIG = {
    PLAYER: {
        SIZE: 96,
        SPEED: 2.0,
        HP_MAX: 100,
        HIT_COOLDOWN: 900,
        HIT_DAMAGE: 10,
        PUSH_FORCE: 8
    },
    ENTITIES: {
        COUNT: { MIN: 2, MAX: 4 },
        SIZE: { MIN: 36, MAX: 84 },
        SPEED: 0.6
    },
    EYES: {
        SPAWN_CHANCE: 0.7,
        SPAWN_TIMER: { MIN: 2200, MAX: 4800 },
        SIZE: { MIN: 30, MAX: 60 },
        ALPHA_MAX: 0.55,
        OPEN_SPEED: { MIN: 0.003, MAX: 0.006 },
        TTL: { MIN: 6, MAX: 16 }
    },
    FOG: {
        COUNT: 4,
        MAX: 5,
        RADIUS: { MIN: 120, MAX: 320 },
        SPEED: { MIN: 0.01, MAX: 0.21 },
        ALPHA: { MIN: 0.02, MAX: 0.14 }
    },
    PARTICLES: {
        COUNT: 70,
        MAX: 60,
        SIZE: { MIN: 0.6, MAX: 2.6 },
        SPEED_X: { MIN: 0.05, MAX: 0.55 },
        SPEED_Y: { MIN: -0.15, MAX: 0.15 },
        ALPHA: { MIN: 0.15, MAX: 0.65 }
    },
    AUDIO: {
        TITLE_VOLUME: 0.5,
        BGM_VOLUME: 0.5,
        WIND_VOLUME: 0.3,
        HIT_VOLUME: 0.3,
        GLITCH_VOLUME: 0.3
    }
};

// ========== GAME STATE MANAGEMENT ==========
class GameState {
    constructor() {
        this.audioOn = true;
        this.paused = true;
        this.onTitle = true;
        this.titleInteracted = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.startedAtTime = 0;
        this.lastFrame = performance.now();
        this.isMobile = this.detectMobile();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    reset() {
        this.onTitle = true;
        this.gameStarted = false;
        this.gameOver = false;
        this.titleInteracted = false;
        this.startedAtTime = 0;
        this.paused = true;
    }
}

// ========== AUDIO MANAGER ==========
class AudioManager {
    constructor() {
        this.titleMusic = new Audio("assets/title.ogg");
        this.bgm = new Audio("assets/bgm.ogg");
        this.windSnd = new Audio("assets/wind.ogg");
        this.coreDreamMusic = new Audio("assets/coreofadream.mp3");
        this.hitSound = new Audio("assets/hit.ogg");
        this.glitchSound = new Audio("assets/glitch.ogg");
        
        this.setupAudio(this.titleMusic, CONFIG.AUDIO.TITLE_VOLUME);
        this.setupAudio(this.bgm, CONFIG.AUDIO.BGM_VOLUME);
        this.setupAudio(this.windSnd, CONFIG.AUDIO.WIND_VOLUME);
        this.setupAudio(this.coreDreamMusic, CONFIG.AUDIO.BGM_VOLUME);
        this.setupAudio(this.hitSound, CONFIG.AUDIO.HIT_VOLUME);
        this.setupAudio(this.glitchSound, CONFIG.AUDIO.GLITCH_VOLUME);
        
        this.hitSound.loop = false;
        this.glitchSound.loop = false;
        
        this.hitSound.addEventListener('ended', this.onHitSoundEnded.bind(this));
        
        this.isHitSoundPlaying = false;
        this.hitSoundTimeout = null;
    }
    
    setupAudio(audio, volume) {
        audio.loop = true;
        audio.volume = volume;
        audio.preload = "auto";
    }
    
    stopAll() {
        [this.titleMusic, this.bgm, this.windSnd, this.coreDreamMusic].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.stopHitSound();
    }
    
    playGameAudio() {
        if (!gameState.audioOn) return;
        
        if (musicChanged) {
            this.coreDreamMusic.play().catch(() => {});
        } else {
            this.bgm.play().catch(() => {});
            this.windSnd.play().catch(() => {});
        }
    }
    
    playHit() {
        if (!gameState.audioOn) return;
        
        this.stopHitSound();
        
        try {
            this.hitSound.currentTime = 0;
            this.hitSound.play().then(() => {
                this.isHitSoundPlaying = true;
                
                this.hitSoundTimeout = setTimeout(() => {
                    if (this.isHitSoundPlaying) {
                        this.stopHitSound();
                    }
                }, 2000);
            }).catch(error => {
                this.isHitSoundPlaying = false;
            });
        } catch (error) {
            this.isHitSoundPlaying = false;
        }
    }
    
    onHitSoundEnded() {
        this.isHitSoundPlaying = false;
        if (this.hitSoundTimeout) {
            clearTimeout(this.hitSoundTimeout);
            this.hitSoundTimeout = null;
        }
    }
    
    stopHitSound() {
        try {
            this.hitSound.pause();
            this.hitSound.currentTime = 0;
            this.isHitSoundPlaying = false;
            
            if (this.hitSoundTimeout) {
                clearTimeout(this.hitSoundTimeout);
                this.hitSoundTimeout = null;
            }
        } catch (error) {}
    }
    
    playGlitch() {
        if (gameState.audioOn) {
            this.glitchSound.currentTime = 0;
            this.glitchSound.play().catch(() => {});
        }
    }
}

// ========== VIRTUAL JOYPAD ==========
class VirtualJoypad {
    constructor() {
        this.base = document.getElementById('joypadBase');
        this.stick = document.getElementById('joypadStick');
        this.mobileControls = document.getElementById('mobileControls');
        
        this.isActive = false;
        this.baseRect = null;
        this.maxStickDistance = 40;
        this.vector = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        this.base.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        this.base.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.activate(e.touches[0]);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (this.isActive) {
            this.updateStick(e.touches[0]);
        }
    }
    
    handleTouchEnd(e) {
        this.deactivate();
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        this.activate(e);
    }
    
    handleMouseMove(e) {
        if (this.isActive) {
            e.preventDefault();
            this.updateStick(e);
        }
    }
    
    handleMouseUp(e) {
        this.deactivate();
    }
    
    activate(input) {
        this.isActive = true;
        this.baseRect = this.base.getBoundingClientRect();
        this.updateStick(input);
    }
    
    updateStick(input) {
        const baseCenterX = this.baseRect.left + this.baseRect.width / 2;
        const baseCenterY = this.baseRect.top + this.baseRect.height / 2;
        
        const deltaX = input.clientX - baseCenterX;
        const deltaY = input.clientY - baseCenterY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);
        
        const limitedDistance = Math.min(distance, this.maxStickDistance);
        
        const stickX = Math.cos(angle) * limitedDistance;
        const stickY = Math.sin(angle) * limitedDistance;
        
        this.stick.style.transform = `translate(${stickX}px, ${stickY}px)`;
        
        this.vector.x = stickX / this.maxStickDistance;
        this.vector.y = stickY / this.maxStickDistance;
    }
    
    deactivate() {
        this.isActive = false;
        this.vector = { x: 0, y: 0 };
        this.stick.style.transform = 'translate(-50%, -50%)';
    }
    
    show() {
        this.mobileControls.classList.remove('hidden');
    }
    
    hide() {
        this.mobileControls.classList.add('hidden');
        this.deactivate();
    }
    
    getVector() {
        return this.vector;
    }
    
    isJoypadActive() {
        return this.isActive;
    }
}

// ========== PLAYER CLASS ==========
class Player {
    constructor() {
        this.reset();
        this.movementEnabled = false;
    }
    
    reset() {
        this.x = canvas.width / 2 - CONFIG.PLAYER.SIZE / 2;
        this.y = canvas.height / 2 - CONFIG.PLAYER.SIZE / 2;
        this.size = CONFIG.PLAYER.SIZE;
        this.hp = CONFIG.PLAYER.HP_MAX;
        this.lastHit = 0;
        this.movementEnabled = true;
    }
    
    update(keys, joypadVector) {
        if (!gameState.gameStarted || gameState.gameOver || gameState.paused || !this.movementEnabled) return;
        
        const speed = CONFIG.PLAYER.SPEED;
        let moveX = 0;
        let moveY = 0;
        
        if (keys["w"] || keys["ArrowUp"]) moveY -= speed;
        if (keys["s"] || keys["ArrowDown"]) moveY += speed;
        if (keys["a"] || keys["ArrowLeft"]) moveX -= speed;
        if (keys["d"] || keys["ArrowRight"]) moveX += speed;
        
        if (joypadVector && (Math.abs(joypadVector.x) > 0.1 || Math.abs(joypadVector.y) > 0.1)) {
            moveX = joypadVector.x * speed * 1.5;
            moveY = joypadVector.y * speed * 1.5;
        }
        
        this.x += moveX;
        this.y += moveY;
        
        this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));
    }
    
    takeDamage(fromEntity) {
        const now = performance.now();
        if (now - this.lastHit > CONFIG.PLAYER.HIT_COOLDOWN) {
            this.hp = Math.max(0, this.hp - CONFIG.PLAYER.HIT_DAMAGE);
            this.lastHit = now;
            
            audioManager.playHit();
            
            const dx = (this.x + this.size/2) - (fromEntity.x + fromEntity.size/2);
            const dy = (this.y + this.size/2) - (fromEntity.y + fromEntity.size/2);
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            
            this.x += (dx/dist) * CONFIG.PLAYER.PUSH_FORCE;
            this.y += (dy/dist) * CONFIG.PLAYER.PUSH_FORCE;
            
            if (this.hp <= 0) {
                gameState.gameOver = true;
                audioManager.bgm.pause();
                audioManager.windSnd.pause();
                audioManager.coreDreamMusic.pause();
                audioManager.stopHitSound();
            }
            
            return true;
        }
        return false;
    }
    
    setMovementEnabled(enabled) {
        this.movementEnabled = enabled;
    }
}

// ========== INITIALIZATION ==========
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const loadingScreen = document.getElementById("loadingScreen");
const gameState = new GameState();
const audioManager = new AudioManager();
const player = new Player();
const joypad = new VirtualJoypad();

// Music change system
let musicChanged = false;
const musicChangeTime = 600000;

// UI Elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const backMenuBtn = document.getElementById("backMenuBtn");
const exitBtn = document.getElementById("exitBtn");
const audioToggleBtn = document.getElementById("audioToggleBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");

// Game objects
let keys = {};
let entities = [];
let eyes = [];
let fogs = [];
let particles = [];
let eyeSpawnTimer = CONFIG.EYES.SPAWN_TIMER.MIN + Math.random() * (CONFIG.EYES.SPAWN_TIMER.MAX - CONFIG.EYES.SPAWN_TIMER.MIN);

// ========== ASSET LOADING ==========
let assetsLoaded = 0;
const totalAssets = 7;

function assetLoaded() {
    assetsLoaded++;
    if (assetsLoaded >= totalAssets) {
        loadingScreen.classList.add('hidden');
    }
}

function handleAssetError(assetName) {
    assetLoaded();
}

const playerImg = new Image();
playerImg.src = "assets/player.png";
playerImg.addEventListener('load', assetLoaded);
playerImg.addEventListener('error', () => handleAssetError('player image'));

const entityImg = new Image();
entityImg.src = "assets/entity.png";
entityImg.addEventListener('load', assetLoaded);
entityImg.addEventListener('error', () => handleAssetError('entity image'));

// Audio loading events
audioManager.titleMusic.addEventListener('canplaythrough', assetLoaded);
audioManager.bgm.addEventListener('canplaythrough', assetLoaded);
audioManager.windSnd.addEventListener('canplaythrough', assetLoaded);
audioManager.coreDreamMusic.addEventListener('canplaythrough', assetLoaded);
audioManager.hitSound.addEventListener('canplaythrough', assetLoaded);
audioManager.glitchSound.addEventListener('canplaythrough', assetLoaded);

audioManager.titleMusic.addEventListener('error', () => handleAssetError('title music'));
audioManager.bgm.addEventListener('error', () => handleAssetError('bgm'));
audioManager.windSnd.addEventListener('error', () => handleAssetError('wind sound'));
audioManager.coreDreamMusic.addEventListener('error', () => handleAssetError('core dream music'));
audioManager.hitSound.addEventListener('error', () => handleAssetError('hit sound'));
audioManager.glitchSound.addEventListener('error', () => handleAssetError('glitch sound'));

// ========== CANVAS SETUP ==========
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameState.gameStarted && !gameState.gameOver) {
        player.x = Math.max(0, Math.min(canvas.width - player.size, canvas.width / 2 - player.size / 2));
        player.y = Math.max(0, Math.min(canvas.height - player.size, canvas.height / 2 - player.size / 2));
    }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ========== INPUT HANDLING ==========
function initializeInputHandling() {
    keys = {};
    
    document.addEventListener("keydown", e => {
        keys[e.key] = true;
        
        if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    document.addEventListener("keyup", e => {
        keys[e.key] = false;
        
        if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
}

initializeInputHandling();

// ========== SETTINGS MODAL ==========
settingsBtn.addEventListener("click", openSettings);
function openSettings() {
    settingsModal.classList.remove("hidden");
    settingsModal.setAttribute("aria-hidden","false");
    audioToggleBtn.textContent = `Audio: ${gameState.audioOn ? "ON" : "OFF"}`;
    pauseResumeBtn.textContent = gameState.paused ? "Resume" : "Pause";
}

function closeSettings() {
    settingsModal.classList.add("hidden");
    settingsModal.setAttribute("aria-hidden","true");
}

settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
});

// Settings actions
backMenuBtn.addEventListener("click", () => {
    audioManager.stopAll();
    gameState.reset();
    player.reset();
    player.setMovementEnabled(false);
    eyes = []; 
    entities = [];
    for (let i = 0; i < CONFIG.ENTITIES.COUNT.MIN; i++) spawnEntity();
    settingsBtn.classList.add('hidden');
    
    if (gameState.isMobile) {
        joypad.hide();
    }
    
    if (gameState.audioOn) audioManager.titleMusic.play().catch(() => {});
    closeSettings();
});

exitBtn.addEventListener("click", () => {
    try { window.close(); } catch(e) {}
    window.location.href = "about:blank";
});

audioToggleBtn.addEventListener("click", () => {
    gameState.audioOn = !gameState.audioOn;
    audioToggleBtn.textContent = `Audio: ${gameState.audioOn ? "ON" : "OFF"}`;
    if (!gameState.audioOn) {
        audioManager.stopAll();
    } else {
        if (gameState.onTitle) {
            audioManager.titleMusic.play().catch(() => {});
        } else if (gameState.gameStarted && !gameState.gameOver) {
            audioManager.playGameAudio();
        }
    }
});

pauseResumeBtn.addEventListener("click", () => {
    if (gameState.onTitle) return;
    
    gameState.paused = !gameState.paused;
    pauseResumeBtn.textContent = gameState.paused ? "Resume" : "Pause";
    if (gameState.paused) {
        audioManager.bgm.pause();
        audioManager.windSnd.pause();
        audioManager.coreDreamMusic.pause();
        player.setMovementEnabled(false);
    } else {
        player.setMovementEnabled(true);
        if (gameState.audioOn && gameState.gameStarted && !gameState.gameOver) {
            audioManager.playGameAudio();
        }
    }
});

// ========== SPAWN FUNCTIONS ==========
function spawnFog() {
    fogs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * (CONFIG.FOG.RADIUS.MAX - CONFIG.FOG.RADIUS.MIN) + CONFIG.FOG.RADIUS.MIN,
        speed: Math.random() * (CONFIG.FOG.SPEED.MAX - CONFIG.FOG.SPEED.MIN) + CONFIG.FOG.SPEED.MIN,
        alpha: Math.random() * (CONFIG.FOG.ALPHA.MAX - CONFIG.FOG.ALPHA.MIN) + CONFIG.FOG.ALPHA.MIN
    });
}

function spawnParticle() {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (CONFIG.PARTICLES.SIZE.MAX - CONFIG.PARTICLES.SIZE.MIN) + CONFIG.PARTICLES.SIZE.MIN,
        speedX: Math.random() * (CONFIG.PARTICLES.SPEED_X.MAX - CONFIG.PARTICLES.SPEED_X.MIN) + CONFIG.PARTICLES.SPEED_X.MIN,
        speedY: Math.random() * (CONFIG.PARTICLES.SPEED_Y.MAX - CONFIG.PARTICLES.SPEED_Y.MIN) + CONFIG.PARTICLES.SPEED_Y.MIN,
        alpha: Math.random() * (CONFIG.PARTICLES.ALPHA.MAX - CONFIG.PARTICLES.ALPHA.MIN) + CONFIG.PARTICLES.ALPHA.MIN
    });
}

function spawnEye() {
    const size = Math.random() * (CONFIG.EYES.SIZE.MAX - CONFIG.EYES.SIZE.MIN) + CONFIG.EYES.SIZE.MIN;
    eyes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.45,
        size,
        alpha: 0,
        openSpeed: Math.random() * (CONFIG.EYES.OPEN_SPEED.MAX - CONFIG.EYES.OPEN_SPEED.MIN) + CONFIG.EYES.OPEN_SPEED.MIN,
        createdAt: performance.now(),
        ttl: (Math.random() * (CONFIG.EYES.TTL.MAX - CONFIG.EYES.TTL.MIN) + CONFIG.EYES.TTL.MIN) * 1000,
        fadingOut: false
    });
}

function spawnEntity() {
    const size = Math.random() * (CONFIG.ENTITIES.SIZE.MAX - CONFIG.ENTITIES.SIZE.MIN) + CONFIG.ENTITIES.SIZE.MIN;
    entities.push({
        x: Math.random() * (canvas.width - size),
        y: Math.random() * (canvas.height - size),
        size: size,
        vx: (Math.random() - 0.5) * CONFIG.ENTITIES.SPEED,
        vy: (Math.random() - 0.5) * CONFIG.ENTITIES.SPEED,
        createdAt: performance.now()
    });
}

// Initialize game environment
for (let i = 0; i < CONFIG.FOG.COUNT; i++) spawnFog();
for (let i = 0; i < CONFIG.PARTICLES.COUNT; i++) spawnParticle();
for (let i = 0; i < CONFIG.ENTITIES.COUNT.MIN; i++) spawnEntity();

// ========== GAME START HANDLING ==========
canvas.addEventListener("click", (e) => {
    if (gameState.onTitle && !gameState.titleInteracted) {
        gameState.titleInteracted = true;
        if (gameState.audioOn) audioManager.titleMusic.play().catch(() => {});
    } else if (gameState.onTitle && gameState.titleInteracted) {
        startGame();
    }
});

document.addEventListener("keydown", (e) => {
    if (gameState.onTitle) {
        if ((e.key === "Enter" || e.key === " ") && gameState.titleInteracted) startGame();
        if ((e.key === "Enter" || e.key === " ") && !gameState.titleInteracted) {
            gameState.titleInteracted = true;
            if (gameState.audioOn) audioManager.titleMusic.play().catch(() => {});
            startGame();
        }
    } else {
        if (gameState.gameOver && (e.key === "r" || e.key === "R")) restartGame();
    }
});

function startGame() {
    gameState.onTitle = false;
    gameState.gameStarted = true;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.startedAtTime = performance.now();
    
    player.setMovementEnabled(true);
    
    settingsBtn.classList.remove('hidden');
    
    if (gameState.isMobile) {
        joypad.show();
    }
    
    if (gameState.audioOn) {
        audioManager.titleMusic.pause();
        audioManager.titleMusic.currentTime = 0;
        audioManager.playGameAudio();
    }
    
    keys = {};
}

function restartGame() {
    player.reset();
    player.setMovementEnabled(true);
    entities = [];
    eyes = [];
    for (let i = 0; i < CONFIG.ENTITIES.COUNT.MIN; i++) spawnEntity();
    gameState.gameOver = false;
    gameState.paused = false;
    musicChanged = false;
    settingsBtn.classList.remove('hidden');
    
    keys = {};
    
    if (gameState.audioOn) audioManager.playGameAudio();
    gameState.startedAtTime = performance.now();
}

// ========== UPDATE LOOP ==========
function update(dt) {
    const deltaTime = dt / 16;
    
    if (gameState.gameStarted && !gameState.gameOver && !musicChanged) {
        const currentTime = performance.now();
        const elapsed = currentTime - gameState.startedAtTime;
        
        if (elapsed >= musicChangeTime) {
            musicChanged = true;
            if (gameState.audioOn) {
                audioManager.bgm.pause();
                audioManager.windSnd.pause();
                audioManager.coreDreamMusic.play().catch(() => {});
            }
        }
    }
    
    if (!gameState.paused && gameState.gameStarted && !gameState.gameOver) {
        const joypadVector = gameState.isMobile ? joypad.getVector() : null;
        
        player.update(keys, joypadVector);
        
        fogs.forEach(f => {
            f.x += f.speed * deltaTime;
            if (f.x - f.radius > canvas.width) {
                f.x = -f.radius;
                f.y = Math.random() * canvas.height;
            }
        });
        if (fogs.length < CONFIG.FOG.MAX && Math.random() < 0.01) spawnFog();
        
        particles.forEach(p => {
            p.x += p.speedX * deltaTime;
            p.y += p.speedY * deltaTime;
            p.alpha -= 0.002 * deltaTime;
        });
        particles = particles.filter(p => p.alpha > 0);
        if (particles.length < CONFIG.PARTICLES.MAX && Math.random() < 0.15) spawnParticle();
        
        const now = performance.now();
        for (let i = eyes.length - 1; i >= 0; i--) {
            const e = eyes[i];
            const age = now - e.createdAt;
            if (!e.fadingOut && e.alpha < CONFIG.EYES.ALPHA_MAX) {
                e.alpha = Math.min(CONFIG.EYES.ALPHA_MAX, e.alpha + e.openSpeed * deltaTime);
            }
            if (!e.fadingOut && age > e.ttl) e.fadingOut = true;
            if (e.fadingOut) {
                e.alpha -= 0.008 * deltaTime;
                if (e.alpha <= 0) {
                    eyes.splice(i, 1);
                    continue;
                }
            }
            e.x += (Math.random() - 0.5) * 0.15 * deltaTime;
            e.y += (Math.random() - 0.5) * 0.12 * deltaTime;
        }
        
        for (let i = entities.length - 1; i >= 0; i--) {
            const en = entities[i];
            en.x += en.vx * deltaTime;
            en.y += en.vy * deltaTime;
            if (en.x < 0 || en.x > canvas.width - en.size) en.vx *= -1;
            if (en.y < 0 || en.y > canvas.height - en.size) en.vy *= -1;
            
            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;
            const ex = en.x + en.size / 2;
            const ey = en.y + en.size / 2;
            const dx = px - ex;
            const dy = py - ey;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (player.size / 2 + en.size / 2)) {
                player.takeDamage(en);
            }
        }
        
        eyeSpawnTimer -= dt;
        if (eyeSpawnTimer <= 0) {
            if (Math.random() < CONFIG.EYES.SPAWN_CHANCE) spawnEye();
            eyeSpawnTimer = CONFIG.EYES.SPAWN_TIMER.MIN + Math.random() * (CONFIG.EYES.SPAWN_TIMER.MAX - CONFIG.EYES.SPAWN_TIMER.MIN);
        }
        if (entities.length < CONFIG.ENTITIES.COUNT.MIN && Math.random() < 0.01) spawnEntity();
    }
}

// ========== DRAWING UTILITIES ==========
function drawCenteredText(text, size = 20, yOffset = 0) {
    ctx.fillStyle = "white";
    ctx.font = `${size}px 'Press Start 2P', monospace`;
    const m = ctx.measureText(text);
    ctx.fillText(text, (canvas.width - m.width) / 2, (canvas.height / 2) + yOffset);
}

function formatTimer(ms) {
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(mm)} : ${pad(ss)}`;
}

// Glitch effect with sound
let glitchSoundPlayed = false;
function drawGlitch() {
    if (!glitchSoundPlayed) {
        audioManager.playGlitch();
        glitchSoundPlayed = true;
        setTimeout(() => { glitchSoundPlayed = false; }, 2000);
    }
    
    const alpha = 0.22 * (1 - player.hp / 30);
    for (let i = 0; i < 10; i++) {
        const w = Math.random() * canvas.width * 0.6;
        const h = 4 + Math.random() * 10;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(${180 + Math.random() * 70 | 0}, 40, 60, ${alpha * 0.4})`;
        ctx.fillRect(x, y, w, h);
    }
    ctx.globalAlpha = alpha * 0.7;
    for (let y = 0; y < canvas.height; y += 6) {
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        ctx.fillRect(0, y, canvas.width, 2);
    }
    ctx.globalAlpha = 1;
}

// ========== DRAW LOOP ==========
function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    fogs.forEach(f => {
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        g.addColorStop(0, `rgba(200,200,255,${f.alpha})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    particles.forEach(p => {
        ctx.fillStyle = `rgba(170,170,220,${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    
    eyes.forEach(e => {
        if (e.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = e.alpha * 0.85;
        ctx.translate(e.x, e.y);
        ctx.scale(1.2, 0.55);
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.restore();
        ctx.strokeStyle = `rgba(255,255,255,${e.alpha * 0.85})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const eyeCx = e.x;
        const eyeCy = e.y;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        let dx = px - eyeCx;
        let dy = py - eyeCy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const maxOffset = Math.max(3, e.size * 0.18);
        const offsetX = (dx / d) * Math.min(maxOffset, d * 0.15);
        const offsetY = (dy / d) * Math.min(maxOffset, d * 0.15);
        const pupilSize = Math.max(3, e.size * 0.16);
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, e.alpha * 1.1)})`;
        ctx.arc(eyeCx + offsetX, eyeCy + offsetY, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(30,30,30,${0.18 * e.alpha})`;
        ctx.arc(eyeCx + offsetX, eyeCy + offsetY, Math.max(1, pupilSize * 0.5), 0, Math.PI * 2);
        ctx.fill();
    });
    
    entities.forEach(en => {
        if (entityImg.complete && entityImg.naturalWidth > 0) {
            ctx.drawImage(entityImg, en.x, en.y, en.size, en.size);
        } else {
            ctx.fillStyle = "rgba(30,30,30,0.95)";
            ctx.beginPath();
            ctx.ellipse(en.x + en.size / 2, en.y + en.size / 2, en.size / 1.2, en.size * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    const radius = Math.max(120, Math.min(canvas.width, canvas.height) * 0.25);
    const light = ctx.createRadialGradient(
        player.x + player.size / 2, player.y + player.size / 2, 0,
        player.x + player.size / 2, player.y + player.size / 2, radius
    );
    light.addColorStop(0, "rgba(255,255,255,0)");
    light.addColorStop(0.5, "rgba(0,0,0,0.64)");
    light.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);
    } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }
    
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `14px 'Press Start 2P', monospace`;
    if (gameState.gameStarted) {
        const elapsed = performance.now() - gameState.startedAtTime;
        ctx.fillText(formatTimer(elapsed), (canvas.width / 2) - 36, 24);
    }
    
    const hpW = 200;
    const hpH = 14;
    const hpX = 16;
    const hpY = canvas.height - (hpH + 16);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = `rgba(${200 - (player.hp * 1.6)}, ${Math.min(200, player.hp * 2)}, 80, 0.95)`;
    ctx.fillRect(hpX, hpY, (player.hp / 100) * hpW, hpH);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = "white";
    ctx.font = `8px 'Press Start 2P', monospace`;
    ctx.fillText(`HP:${Math.round(player.hp)}`, hpX + 6, hpY + hpH - 2);
    
    let warning = false;
    for (const en of entities) {
        const dx = (player.x + player.size / 2) - (en.x + en.size / 2);
        const dy = (player.y + player.size / 2) - (en.y + en.size / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
            warning = true;
            break;
        }
    }
    if (warning) {
        const t = performance.now();
        if (Math.floor(t / 300) % 2 === 0) {
            ctx.fillStyle = "rgba(255,60,60,0.95)";
            ctx.font = `28px 'Press Start 2P', monospace`;
            ctx.fillText("!", canvas.width - 44, 34);
        }
    }
    
    if (gameState.onTitle) {
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = `34px 'Press Start 2P', monospace`;
        const title = "DREAM HORROR";
        const m = ctx.measureText(title);
        ctx.fillText(title, (canvas.width - m.width) / 2, canvas.height * 0.33);
        
        ctx.font = `12px 'Press Start 2P', monospace`;
        const versionText = "0.1.0";
        const mv = ctx.measureText(versionText);
        ctx.fillText(versionText, (canvas.width - mv.width) / 2, canvas.height * 0.33 + 40);
        
        ctx.font = `12px 'Press Start 2P', monospace`;
        if (!gameState.titleInteracted) {
            const hint = "Click to enable title audio";
            const mh = ctx.measureText(hint);
            ctx.fillText(hint, (canvas.width - mh.width) / 2, canvas.height * 0.45);
        } else {
            const startTxt = "Press Enter or Click to Start";
            const ms = ctx.measureText(startTxt);
            ctx.fillText(startTxt, (canvas.width - ms.width) / 2, canvas.height * 0.45);
        }
        ctx.font = `10px 'Press Start 2P', monospace`;
        const ins = "WASD / Arrow keys to move";
        const mi = ctx.measureText(ins);
        ctx.fillText(ins, (canvas.width - mi.width) / 2, canvas.height * 0.5);
    }
    
    if (gameState.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = `28px 'Press Start 2P', monospace`;
        const t = "GAME OVER";
        const mT = ctx.measureText(t);
        ctx.fillText(t, (canvas.width - mT.width) / 2, canvas.height / 2 - 20);
        ctx.font = `12px 'Press Start 2P', monospace`;
        const r = "Press R to Restart";
        const mR = ctx.measureText(r);
        ctx.fillText(r, (canvas.width - mR.width) / 2, canvas.height / 2 + 10);
    }
    
    if (player.hp < 30 && gameState.gameStarted && !gameState.gameOver) {
        drawGlitch();
    }
}

// ========== MAIN GAME LOOP ==========
function loop(ts) {
    const now = ts || performance.now();
    const dt = Math.min(60, now - gameState.lastFrame);
    gameState.lastFrame = now;
    
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// ========== START GAME ==========
window.addEventListener('load', () => {
    player.setMovementEnabled(false);
    
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 3000);
    
    requestAnimationFrame(loop);
});

// Enhanced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
    }, 100);
});