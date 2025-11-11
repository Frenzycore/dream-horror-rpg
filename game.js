/**
 * Dream Horror RPG - Production Ready Game
 * A psychological horror experience in the dream realm
 * @version 1.0.0
 * @license MIT
 */

// Game Configuration Constants
const CONFIG = {
    // Player configuration
    PLAYER: {
        SIZE: 96,
        SPEED: 2.2,
        HP_MAX: 100,
        HIT_COOLDOWN: 900,
        HIT_DAMAGE: 12,
        PUSH_FORCE: 10,
        INVINCIBILITY_DURATION: 500
    },
    
    // Entity configuration
    ENTITIES: {
        COUNT: { MIN: 2, MAX: 5 },
        SIZE: { MIN: 40, MAX: 80 },
        SPEED: 0.7,
        SPAWN_RATE: 0.008
    },
    
    // Eye entities configuration
    EYES: {
        SPAWN_CHANCE: 0.65,
        SPAWN_TIMER: { MIN: 2500, MAX: 5000 },
        SIZE: { MIN: 25, MAX: 55 },
        ALPHA_MAX: 0.6,
        OPEN_SPEED: { MIN: 0.004, MAX: 0.007 },
        TTL: { MIN: 8, MAX: 18 }
    },
    
    // Environmental effects
    FOG: {
        COUNT: 5,
        MAX: 6,
        RADIUS: { MIN: 150, MAX: 350 },
        SPEED: { MIN: 0.015, MAX: 0.025 },
        ALPHA: { MIN: 0.03, MAX: 0.16 }
    },
    
    // Particle system
    PARTICLES: {
        COUNT: 80,
        MAX: 70,
        SIZE: { MIN: 0.8, MAX: 3.0 },
        SPEED_X: { MIN: 0.06, MAX: 0.6 },
        SPEED_Y: { MIN: -0.12, MAX: 0.12 },
        ALPHA: { MIN: 0.2, MAX: 0.7 },
        SPAWN_RATE: 0.2
    },
    
    // Audio configuration
    AUDIO: {
        TITLE_VOLUME: 0.5,
        BGM_VOLUME: 0.5,
        WIND_VOLUME: 0.3,
        HIT_VOLUME: 0.3,
        GLITCH_VOLUME: 0.3,
        MASTER_VOLUME: 1.0
    },
    
    // Performance settings
    PERFORMANCE: {
        MAX_ENTITIES: 8,
        MAX_EYES: 15,
        MAX_PARTICLES: 100,
        FRAME_RATE: 60
    }
};

/**
 * Game State Management Class
 * Handles all game state and transitions
 */
class GameState {
    constructor() {
        this.audioEnabled = true;
        this.paused = true;
        this.onTitleScreen = true;
        this.titleAudioStarted = false;
        this.gameActive = false;
        this.gameOver = false;
        this.gameStartTime = 0;
        this.lastFrameTime = performance.now();
        this.musicChanged = false;
        this.playerInvincible = false;
    }
    
    reset() {
        this.audioEnabled = true;
        this.paused = true;
        this.onTitleScreen = true;
        this.titleAudioStarted = false;
        this.gameActive = false;
        this.gameOver = false;
        this.gameStartTime = 0;
        this.musicChanged = false;
        this.playerInvincible = false;
    }
    
    startGame() {
        this.onTitleScreen = false;
        this.gameActive = true;
        this.gameOver = false;
        this.paused = false;
        this.gameStartTime = performance.now();
    }
    
    endGame() {
        this.gameActive = false;
        this.gameOver = true;
        this.paused = true;
    }
}

/**
 * Advanced Audio Management System
 * Handles all audio operations with proper error handling
 */
class AudioManager {
    constructor() {
        this.audioElements = new Map();
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;
        
        // Audio file configurations
        this.audioFiles = [
            { id: 'title', src: 'assets/title.ogg', volume: CONFIG.AUDIO.TITLE_VOLUME, loop: true },
            { id: 'bgm', src: 'assets/bgm.ogg', volume: CONFIG.AUDIO.BGM_VOLUME, loop: true },
            { id: 'wind', src: 'assets/wind.ogg', volume: CONFIG.AUDIO.WIND_VOLUME, loop: true },
            { id: 'coreDream', src: 'assets/coreofadream.mp3', volume: CONFIG.AUDIO.BGM_VOLUME, loop: true },
            { id: 'hit', src: 'assets/hit.ogg', volume: CONFIG.AUDIO.HIT_VOLUME, loop: false },
            { id: 'glitch', src: 'assets/glitch.ogg', volume: CONFIG.AUDIO.GLITCH_VOLUME, loop: false }
        ];
        
        this.currentMusic = null;
        this.isHitPlaying = false;
        this.hitTimeout = null;
    }
    
    async initialize() {
        try {
            // Create audio context for better control
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
            this.masterGain.connect(this.audioContext.destination);
            
            // Preload all audio files
            await this.preloadAudio();
            this.initialized = true;
            return true;
        } catch (error) {
            console.warn('Web Audio API not supported, falling back to HTML5 Audio:', error);
            await this.preloadAudio();
            this.initialized = true;
            return true;
        }
    }
    
    async preloadAudio() {
        const loadPromises = this.audioFiles.map(file => this.loadAudioFile(file));
        await Promise.allSettled(loadPromises);
    }
    
    async loadAudioFile({ id, src, volume, loop }) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = volume;
            audio.loop = loop;
            
            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
            audio.addEventListener('error', () => {
                console.warn(`Failed to load audio: ${src}`);
                resolve(null);
            });
            
            audio.src = src;
            this.audioElements.set(id, audio);
            
            // Force loading
            audio.load();
        });
    }
    
    play(id) {
        if (!this.initialized || !gameState.audioEnabled) return;
        
        const audio = this.audioElements.get(id);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.warn(`Could not play audio ${id}:`, error);
            });
        }
    }
    
    stop(id) {
        const audio = this.audioElements.get(id);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }
    
    pause(id) {
        const audio = this.audioElements.get(id);
        if (audio) {
            audio.pause();
        }
    }
    
    setVolume(id, volume) {
        const audio = this.audioElements.get(id);
        if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    // Specialized audio methods
    playHitSound() {
        if (this.isHitPlaying) return;
        
        this.isHitPlaying = true;
        this.play('hit');
        
        this.hitTimeout = setTimeout(() => {
            this.isHitPlaying = false;
        }, 500);
    }
    
    stopHitSound() {
        if (this.hitTimeout) {
            clearTimeout(this.hitTimeout);
            this.hitTimeout = null;
        }
        this.isHitPlaying = false;
        this.stop('hit');
    }
    
    playGameMusic() {
        if (gameState.musicChanged) {
            this.play('coreDream');
            this.currentMusic = 'coreDream';
        } else {
            this.play('bgm');
            this.play('wind');
            this.currentMusic = 'bgm';
        }
    }
    
    stopAllMusic() {
        this.stop('title');
        this.stop('bgm');
        this.stop('wind');
        this.stop('coreDream');
        this.currentMusic = null;
    }
    
    setMasterVolume(volume) {
        const newVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = newVolume;
        }
        // Also update HTML5 audio volumes
        this.audioElements.forEach(audio => {
            if (audio) {
                const originalVolume = this.audioFiles.find(f => this.audioElements.get(f.id) === audio)?.volume || 1;
                audio.volume = originalVolume * newVolume;
            }
        });
    }
}

/**
 * Player Class with Enhanced Controls
 * Handles player state, movement, and interactions
 */
class Player {
    constructor() {
        this.reset();
        this.movementEnabled = false;
        this.invincibilityEndTime = 0;
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.size = CONFIG.PLAYER.SIZE;
        this.health = CONFIG.PLAYER.HP_MAX;
        this.lastHitTime = 0;
        this.movementEnabled = true;
        this.invincibilityEndTime = 0;
    }
    
    initializePosition(canvasWidth, canvasHeight) {
        this.x = (canvasWidth - this.size) / 2;
        this.y = (canvasHeight - this.size) / 2;
    }
    
    update(keys, canvasWidth, canvasHeight) {
        if (!this.canMove()) return;
        
        const speed = CONFIG.PLAYER.SPEED;
        
        // Movement input handling
        if (keys['w'] || keys['ArrowUp']) this.y -= speed;
        if (keys['s'] || keys['ArrowDown']) this.y += speed;
        if (keys['a'] || keys['ArrowLeft']) this.x -= speed;
        if (keys['d'] || keys['ArrowRight']) this.x += speed;
        
        // Boundary constraints
        this.x = Math.max(0, Math.min(canvasWidth - this.size, this.x));
        this.y = Math.max(0, Math.min(canvasHeight - this.size, this.y));
        
        // Update invincibility state
        this.updateInvincibility();
    }
    
    canMove() {
        return gameState.gameActive && !gameState.paused && this.movementEnabled && !gameState.onTitleScreen;
    }
    
    updateInvincibility() {
        gameState.playerInvincible = performance.now() < this.invincibilityEndTime;
    }
    
    takeDamage(damageSource) {
        const currentTime = performance.now();
        
        // Check cooldown and invincibility
        if (currentTime - this.lastHitTime < CONFIG.PLAYER.HIT_COOLDOWN || gameState.playerInvincible) {
            return false;
        }
        
        // Apply damage
        this.health = Math.max(0, this.health - CONFIG.PLAYER.HIT_DAMAGE);
        this.lastHitTime = currentTime;
        this.invincibilityEndTime = currentTime + CONFIG.PLAYER.INVINCIBILITY_DURATION;
        
        // Play hit sound
        audioManager.playHitSound();
        
        // Apply knockback
        this.applyKnockback(damageSource);
        
        // Check for game over
        if (this.health <= 0) {
            gameState.endGame();
            audioManager.stopAllMusic();
        }
        
        return true;
    }
    
    applyKnockback(damageSource) {
        const playerCenterX = this.x + this.size / 2;
        const playerCenterY = this.y + this.size / 2;
        const entityCenterX = damageSource.x + damageSource.size / 2;
        const entityCenterY = damageSource.y + damageSource.size / 2;
        
        const deltaX = playerCenterX - entityCenterX;
        const deltaY = playerCenterY - entityCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
        
        const knockbackX = (deltaX / distance) * CONFIG.PLAYER.PUSH_FORCE;
        const knockbackY = (deltaY / distance) * CONFIG.PLAYER.PUSH_FORCE;
        
        this.x += knockbackX;
        this.y += knockbackY;
    }
    
    setMovementEnabled(enabled) {
        this.movementEnabled = enabled;
    }
    
    getCenter() {
        return {
            x: this.x + this.size / 2,
            y: this.y + this.size / 2
        };
    }
}

/**
 * Entity Management System
 * Handles game entities (enemies, eyes, environmental effects)
 */
class EntityManager {
    constructor() {
        this.entities = [];
        this.eyes = [];
        this.fogs = [];
        this.particles = [];
        this.eyeSpawnTimer = 0;
        this.resetEyeSpawnTimer();
    }
    
    reset() {
        this.entities = [];
        this.eyes = [];
        this.fogs = [];
        this.particles = [];
        this.resetEyeSpawnTimer();
    }
    
    resetEyeSpawnTimer() {
        this.eyeSpawnTimer = CONFIG.EYES.SPAWN_TIMER.MIN + 
            Math.random() * (CONFIG.EYES.SPAWN_TIMER.MAX - CONFIG.EYES.SPAWN_TIMER.MIN);
    }
    
    initializeEnvironment() {
        // Initialize fog
        for (let i = 0; i < CONFIG.FOG.COUNT; i++) {
            this.spawnFog();
        }
        
        // Initialize particles
        for (let i = 0; i < CONFIG.PARTICLES.COUNT; i++) {
            this.spawnParticle();
        }
        
        // Initialize entities
        for (let i = 0; i < CONFIG.ENTITIES.COUNT.MIN; i++) {
            this.spawnEntity();
        }
    }
    
    spawnFog() {
        if (this.fogs.length >= CONFIG.PERFORMANCE.MAX_ENTITIES) return;
        
        this.fogs.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * (CONFIG.FOG.RADIUS.MAX - CONFIG.FOG.RADIUS.MIN) + CONFIG.FOG.RADIUS.MIN,
            speed: Math.random() * (CONFIG.FOG.SPEED.MAX - CONFIG.FOG.SPEED.MIN) + CONFIG.FOG.SPEED.MIN,
            alpha: Math.random() * (CONFIG.FOG.ALPHA.MAX - CONFIG.FOG.ALPHA.MIN) + CONFIG.FOG.ALPHA.MIN
        });
    }
    
    spawnParticle() {
        if (this.particles.length >= CONFIG.PERFORMANCE.MAX_PARTICLES) return;
        
        this.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * (CONFIG.PARTICLES.SIZE.MAX - CONFIG.PARTICLES.SIZE.MIN) + CONFIG.PARTICLES.SIZE.MIN,
            speedX: Math.random() * (CONFIG.PARTICLES.SPEED_X.MAX - CONFIG.PARTICLES.SPEED_X.MIN) + CONFIG.PARTICLES.SPEED_X.MIN,
            speedY: Math.random() * (CONFIG.PARTICLES.SPEED_Y.MAX - CONFIG.PARTICLES.SPEED_Y.MIN) + CONFIG.PARTICLES.SPEED_Y.MIN,
            alpha: Math.random() * (CONFIG.PARTICLES.ALPHA.MAX - CONFIG.PARTICLES.ALPHA.MIN) + CONFIG.PARTICLES.ALPHA.MIN
        });
    }
    
    spawnEye() {
        if (this.eyes.length >= CONFIG.PERFORMANCE.MAX_EYES) return;
        
        const size = Math.random() * (CONFIG.EYES.SIZE.MAX - CONFIG.EYES.SIZE.MIN) + CONFIG.EYES.SIZE.MIN;
        this.eyes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.45,
            size: size,
            alpha: 0,
            openSpeed: Math.random() * (CONFIG.EYES.OPEN_SPEED.MAX - CONFIG.EYES.OPEN_SPEED.MIN) + CONFIG.EYES.OPEN_SPEED.MIN,
            createdTime: performance.now(),
            lifetime: (Math.random() * (CONFIG.EYES.TTL.MAX - CONFIG.EYES.TTL.MIN) + CONFIG.EYES.TTL.MIN) * 1000,
            fadingOut: false
        });
    }
    
    spawnEntity() {
        if (this.entities.length >= CONFIG.PERFORMANCE.MAX_ENTITIES) return;
        
        const size = Math.random() * (CONFIG.ENTITIES.SIZE.MAX - CONFIG.ENTITIES.SIZE.MIN) + CONFIG.ENTITIES.SIZE.MIN;
        this.entities.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * (canvas.height - size),
            size: size,
            velocityX: (Math.random() - 0.5) * CONFIG.ENTITIES.SPEED,
            velocityY: (Math.random() - 0.5) * CONFIG.ENTITIES.SPEED,
            createdTime: performance.now()
        });
    }
    
    update(deltaTime, player) {
        if (gameState.paused || !gameState.gameActive) return;
        
        this.updateFog(deltaTime);
        this.updateParticles(deltaTime);
        this.updateEyes(deltaTime);
        this.updateEntities(deltaTime, player);
        this.handleSpawning(deltaTime);
    }
    
    updateFog(deltaTime) {
        const normalizedDelta = deltaTime / 16;
        
        this.fogs.forEach(fog => {
            fog.x += fog.speed * normalizedDelta;
            if (fog.x - fog.radius > canvas.width) {
                fog.x = -fog.radius;
                fog.y = Math.random() * canvas.height;
            }
        });
        
        // Spawn new fog if needed
        if (this.fogs.length < CONFIG.FOG.MAX && Math.random() < 0.01) {
            this.spawnFog();
        }
    }
    
    updateParticles(deltaTime) {
        const normalizedDelta = deltaTime / 16;
        
        // Update existing particles
        this.particles.forEach(particle => {
            particle.x += particle.speedX * normalizedDelta;
            particle.y += particle.speedY * normalizedDelta;
            particle.alpha -= 0.002 * normalizedDelta;
        });
        
        // Remove dead particles
        this.particles = this.particles.filter(particle => particle.alpha > 0);
        
        // Spawn new particles
        if (this.particles.length < CONFIG.PARTICLES.MAX && Math.random() < CONFIG.PARTICLES.SPAWN_RATE) {
            this.spawnParticle();
        }
    }
    
    updateEyes(deltaTime) {
        const currentTime = performance.now();
        const normalizedDelta = deltaTime / 16;
        
        for (let i = this.eyes.length - 1; i >= 0; i--) {
            const eye = this.eyes[i];
            const age = currentTime - eye.createdTime;
            
            // Handle eye opening
            if (!eye.fadingOut && eye.alpha < CONFIG.EYES.ALPHA_MAX) {
                eye.alpha = Math.min(CONFIG.EYES.ALPHA_MAX, eye.alpha + eye.openSpeed * normalizedDelta);
            }
            
            // Start fading out if lifetime exceeded
            if (!eye.fadingOut && age > eye.lifetime) {
                eye.fadingOut = true;
            }
            
            // Handle fading out
            if (eye.fadingOut) {
                eye.alpha -= 0.008 * normalizedDelta;
                if (eye.alpha <= 0) {
                    this.eyes.splice(i, 1);
                    continue;
                }
            }
            
            // Subtle movement
            eye.x += (Math.random() - 0.5) * 0.15 * normalizedDelta;
            eye.y += (Math.random() - 0.5) * 0.12 * normalizedDelta;
        }
    }
    
    updateEntities(deltaTime, player) {
        const normalizedDelta = deltaTime / 16;
        
        this.entities.forEach(entity => {
            // Movement
            entity.x += entity.velocityX * normalizedDelta;
            entity.y += entity.velocityY * normalizedDelta;
            
            // Boundary collision
            if (entity.x < 0 || entity.x > canvas.width - entity.size) {
                entity.velocityX *= -1;
                entity.x = Math.max(0, Math.min(canvas.width - entity.size, entity.x));
            }
            if (entity.y < 0 || entity.y > canvas.height - entity.size) {
                entity.velocityY *= -1;
                entity.y = Math.max(0, Math.min(canvas.height - entity.size, entity.y));
            }
            
            // Player collision detection
            this.checkPlayerCollision(entity, player);
        });
        
        // Spawn new entities if needed
        if (this.entities.length < CONFIG.ENTITIES.COUNT.MIN && Math.random() < CONFIG.ENTITIES.SPAWN_RATE) {
            this.spawnEntity();
        }
    }
    
    checkPlayerCollision(entity, player) {
        const playerCenter = player.getCenter();
        const entityCenter = {
            x: entity.x + entity.size / 2,
            y: entity.y + entity.size / 2
        };
        
        const deltaX = playerCenter.x - entityCenter.x;
        const deltaY = playerCenter.y - entityCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const minDistance = (player.size / 2) + (entity.size / 2);
        
        if (distance < minDistance) {
            player.takeDamage(entity);
        }
    }
    
    handleSpawning(deltaTime) {
        // Eye spawning
        this.eyeSpawnTimer -= deltaTime;
        if (this.eyeSpawnTimer <= 0) {
            if (Math.random() < CONFIG.EYES.SPAWN_CHANCE) {
                this.spawnEye();
            }
            this.resetEyeSpawnTimer();
        }
    }
}

/**
 * Rendering System
 * Handles all drawing operations and visual effects
 */
class Renderer {
    constructor(context) {
        this.ctx = context;
        this.glitchSoundPlayed = false;
        this.lastGlitchTime = 0;
    }
    
    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    renderGameWorld(entityManager, player, playerImage, entityImage) {
        this.renderFog(entityManager.fogs);
        this.renderParticles(entityManager.particles);
        this.renderEyes(entityManager.eyes, player);
        this.renderEntities(entityManager.entities, entityImage);
        this.renderLighting(player);
        this.renderPlayer(player, playerImage);
    }
    
    renderFog(fogs) {
        fogs.forEach(fog => {
            const gradient = this.ctx.createRadialGradient(
                fog.x, fog.y, 0,
                fog.x, fog.y, fog.radius
            );
            gradient.addColorStop(0, `rgba(200, 200, 255, ${fog.alpha})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderParticles(particles) {
        particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(170, 170, 220, ${particle.alpha})`;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
    }
    
    renderEyes(eyes, player) {
        const playerCenter = player.getCenter();
        
        eyes.forEach(eye => {
            if (eye.alpha <= 0) return;
            
            this.ctx.save();
            
            // Draw eye outline
            this.ctx.globalAlpha = eye.alpha * 0.85;
            this.ctx.translate(eye.x, eye.y);
            this.ctx.scale(1.2, 0.55);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, eye.size, 0, Math.PI * 2);
            this.ctx.restore();
            
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${eye.alpha * 0.85})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Calculate pupil position (look at player)
            const deltaX = playerCenter.x - eye.x;
            const deltaY = playerCenter.y - eye.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
            const maxOffset = Math.max(3, eye.size * 0.18);
            const offsetX = (deltaX / distance) * Math.min(maxOffset, distance * 0.15);
            const offsetY = (deltaY / distance) * Math.min(maxOffset, distance * 0.15);
            const pupilSize = Math.max(3, eye.size * 0.16);
            
            // Draw pupil
            this.ctx.beginPath();
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, eye.alpha * 1.1)})`;
            this.ctx.arc(eye.x + offsetX, eye.y + offsetY, pupilSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw pupil center
            this.ctx.beginPath();
            this.ctx.fillStyle = `rgba(30, 30, 30, ${0.18 * eye.alpha})`;
            this.ctx.arc(eye.x + offsetX, eye.y + offsetY, Math.max(1, pupilSize * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderEntities(entities, entityImage) {
        entities.forEach(entity => {
            if (entityImage.complete && entityImage.naturalWidth > 0) {
                this.ctx.drawImage(entityImage, entity.x, entity.y, entity.size, entity.size);
            } else {
                // Fallback rendering
                this.ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
                this.ctx.beginPath();
                this.ctx.ellipse(
                    entity.x + entity.size / 2,
                    entity.y + entity.size / 2,
                    entity.size / 1.2,
                    entity.size * 0.9,
                    0, 0, Math.PI * 2
                );
                this.ctx.fill();
            }
        });
    }
    
    renderLighting(player) {
        const radius = Math.max(120, Math.min(canvas.width, canvas.height) * 0.25);
        const playerCenter = player.getCenter();
        
        const gradient = this.ctx.createRadialGradient(
            playerCenter.x, playerCenter.y, 0,
            playerCenter.x, playerCenter.y, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.64)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    renderPlayer(player, playerImage) {
        if (playerImage.complete && playerImage.naturalWidth > 0) {
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(playerImage, player.x, player.y, player.size, player.size);
        } else {
            // Fallback rendering
            this.ctx.fillStyle = gameState.playerInvincible ? 'rgba(255, 255, 255, 0.5)' : '#ffffff';
            this.ctx.fillRect(player.x, player.y, player.size, player.size);
        }
    }
    
    renderHUD(player) {
        this.renderTimer();
        this.renderHealthBar(player);
        this.renderWarningIndicator(player);
    }
    
    renderTimer() {
        if (!gameState.gameActive) return;
        
        const elapsed = performance.now() - gameState.gameStartTime;
        const formattedTime = this.formatTime(elapsed);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.font = '14px "Press Start 2P", monospace';
        this.ctx.fillText(formattedTime, canvas.width / 2 - 36, 24);
    }
    
    renderHealthBar(player) {
        const width = 200;
        const height = 14;
        const x = 16;
        const y = canvas.height - (height + 16);
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.fillRect(x, y, width, height);
        
        // Health fill
        const healthPercent = player.health / CONFIG.PLAYER.HP_MAX;
        const healthWidth = healthPercent * width;
        
        // Color based on health (green -> yellow -> red)
        let r, g;
        if (healthPercent > 0.5) {
            r = Math.floor(255 * (1 - healthPercent) * 2);
            g = 200;
        } else {
            r = 200;
            g = Math.floor(255 * healthPercent * 2);
        }
        
        this.ctx.fillStyle = `rgba(${r}, ${g}, 80, 0.95)`;
        this.ctx.fillRect(x, y, healthWidth, height);
        
        // Border
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
        
        // Text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '8px "Press Start 2P", monospace';
        this.ctx.fillText(`HP:${Math.round(player.health)}`, x + 6, y + height - 2);
    }
    
    renderWarningIndicator(player) {
        const playerCenter = player.getCenter();
        const warningDistance = 120;
        
        // Check if any entity is too close
        const isWarning = entityManager.entities.some(entity => {
            const entityCenter = {
                x: entity.x + entity.size / 2,
                y: entity.y + entity.size / 2
            };
            const deltaX = playerCenter.x - entityCenter.x;
            const deltaY = playerCenter.y - entityCenter.y;
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY) < warningDistance;
        });
        
        if (isWarning) {
            const currentTime = performance.now();
            // Blink effect (every 300ms)
            if (Math.floor(currentTime / 300) % 2 === 0) {
                this.ctx.fillStyle = 'rgba(255, 60, 60, 0.95)';
                this.ctx.font = '28px "Press Start 2P", monospace';
                this.ctx.fillText('!', canvas.width - 44, 34);
            }
        }
    }
    
    renderTitleScreen() {
        // Solid black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Game title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '34px "Press Start 2P", monospace';
        const title = 'DREAM HORROR';
        const titleWidth = this.ctx.measureText(title).width;
        this.ctx.fillText(title, (canvas.width - titleWidth) / 2, canvas.height * 0.33);
        
        // Version number
        this.ctx.font = '12px "Press Start 2P", monospace';
        const version = '1.0.0';
        const versionWidth = this.ctx.measureText(version).width;
        this.ctx.fillText(version, (canvas.width - versionWidth) / 2, canvas.height * 0.33 + 40);
        
        // Instructions
        this.ctx.font = '12px "Press Start 2P", monospace';
        let instructionText, instructionWidth;
        
        if (!gameState.titleAudioStarted) {
            instructionText = 'Click to enable title audio';
            instructionWidth = this.ctx.measureText(instructionText).width;
            this.ctx.fillText(instructionText, (canvas.width - instructionWidth) / 2, canvas.height * 0.45);
        } else {
            instructionText = 'Press Enter or Click to Start';
            instructionWidth = this.ctx.measureText(instructionText).width;
            this.ctx.fillText(instructionText, (canvas.width - instructionWidth) / 2, canvas.height * 0.45);
        }
        
        // Controls hint
        this.ctx.font = '10px "Press Start 2P", monospace';
        const controls = 'WASD / Arrow keys to move';
        const controlsWidth = this.ctx.measureText(controls).width;
        this.ctx.fillText(controls, (canvas.width - controlsWidth) / 2, canvas.height * 0.5);
    }
    
    renderGameOver() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Game over text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '28px "Press Start 2P", monospace';
        const gameOverText = 'GAME OVER';
        const textWidth = this.ctx.measureText(gameOverText).width;
        this.ctx.fillText(gameOverText, (canvas.width - textWidth) / 2, canvas.height / 2 - 20);
        
        // Restart instruction
        this.ctx.font = '12px "Press Start 2P", monospace';
        const restartText = 'Press R to Restart';
        const restartWidth = this.ctx.measureText(restartText).width;
        this.ctx.fillText(restartText, (canvas.width - restartWidth) / 2, canvas.height / 2 + 10);
    }
    
    renderGlitchEffect(player) {
        if (player.health >= 30) return;
        
        const currentTime = performance.now();
        
        // Play glitch sound (once per glitch session)
        if (!this.glitchSoundPlayed || currentTime - this.lastGlitchTime > 2000) {
            audioManager.play('glitch');
            this.glitchSoundPlayed = true;
            this.lastGlitchTime = currentTime;
            
            // Reset glitch sound after delay
            setTimeout(() => {
                this.glitchSoundPlayed = false;
            }, 2000);
        }
        
        const intensity = 0.22 * (1 - player.health / 30);
        
        // Color shift rectangles
        for (let i = 0; i < 10; i++) {
            const width = Math.random() * canvas.width * 0.6;
            const height = 4 + Math.random() * 10;
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            
            this.ctx.fillStyle = `rgba(${180 + Math.random() * 70 | 0}, 40, 60, ${intensity * 0.4})`;
            this.ctx.fillRect(x, y, width, height);
        }
        
        // Scan lines
        this.ctx.globalAlpha = intensity * 0.7;
        for (let yPos = 0; yPos < canvas.height; yPos += 6) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            this.ctx.fillRect(0, yPos, canvas.width, 2);
        }
        this.ctx.globalAlpha = 1;
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const pad = (number) => number.toString().padStart(2, '0');
        return `${pad(minutes)} : ${pad(seconds)}`;
    }
}

/**
 * Input Management System
 * Handles keyboard and mouse input
 */
class InputManager {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => {
            this.keys[event.key] = true;
            this.handleGameControls(event);
            
            // Prevent default for game controls
            if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.key] = false;
            
            // Prevent default for game controls
            if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                event.preventDefault();
            }
        });
        
        // Mouse events
        canvas.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });
        
        // Window blur (pause game when tab loses focus)
        window.addEventListener('blur', () => {
            if (gameState.gameActive && !gameState.paused) {
                this.togglePause();
            }
        });
    }
    
    handleGameControls(event) {
        // Escape key - toggle settings
        if (event.key === 'Escape') {
            if (settingsModal.classList.contains('hidden')) {
                openSettings();
            } else {
                closeSettings();
            }
            event.preventDefault();
        }
        
        // Enter or Space - start game from title screen
        if ((event.key === 'Enter' || event.key === ' ') && gameState.onTitleScreen) {
            if (gameState.titleAudioStarted) {
                startGame();
            } else {
                startTitleAudio();
                startGame();
            }
            event.preventDefault();
        }
        
        // R key - restart game
        if ((event.key === 'r' || event.key === 'R') && gameState.gameOver) {
            restartGame();
            event.preventDefault();
        }
        
        // P key - pause/resume game
        if ((event.key === 'p' || event.key === 'P') && gameState.gameActive) {
            this.togglePause();
            event.preventDefault();
        }
    }
    
    handleMouseClick(event) {
        if (gameState.onTitleScreen) {
            if (!gameState.titleAudioStarted) {
                startTitleAudio();
            } else {
                startGame();
            }
        }
    }
    
    togglePause() {
        if (!gameState.gameActive) return;
        
        gameState.paused = !gameState.paused;
        pauseResumeBtn.textContent = gameState.paused ? 'Resume Game' : 'Pause Game';
        
        if (gameState.paused) {
            audioManager.pause('bgm');
            audioManager.pause('wind');
            audioManager.pause('coreDream');
            player.setMovementEnabled(false);
        } else {
            player.setMovementEnabled(true);
            if (gameState.audioEnabled) {
                audioManager.playGameMusic();
            }
        }
    }
    
    reset() {
        this.keys = {};
    }
}

// Global variables
let canvas, ctx;
let gameState, audioManager, player, entityManager, renderer, inputManager;
let playerImage, entityImage;
let assetsLoaded = 0;
const totalAssets = 8; // 2 images + 6 audio files

// DOM elements
let loadingScreen, loadingProgress;
let settingsBtn, settingsModal, backMenuBtn, exitBtn, audioToggleBtn, pauseResumeBtn;

/**
 * Main Game Initialization
 */
async function initializeGame() {
    try {
        // Initialize DOM references
        initializeDOMElements();
        
        // Set up canvas
        initializeCanvas();
        
        // Initialize game systems
        await initializeGameSystems();
        
        // Set up UI event listeners
        initializeUIEvents();
        
        // Start game loop
        requestAnimationFrame(gameLoop);
        
        console.log('Dream Horror RPG initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorScreen('Failed to load game. Please refresh the page.');
    }
}

function initializeDOMElements() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    loadingScreen = document.getElementById('loadingScreen');
    loadingProgress = document.getElementById('loadingProgress');
    
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    backMenuBtn = document.getElementById('backMenuBtn');
    exitBtn = document.getElementById('exitBtn');
    audioToggleBtn = document.getElementById('audioToggleBtn');
    pauseResumeBtn = document.getElementById('pauseResumeBtn');
}

function initializeCanvas() {
    function resizeCanvas() {
        const displayWidth = Math.floor(window.innerWidth);
        const displayHeight = Math.floor(window.innerHeight);
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            
            if (player) {
                player.initializePosition(displayWidth, displayHeight);
            }
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

async function initializeGameSystems() {
    // Initialize core systems
    gameState = new GameState();
    audioManager = new AudioManager();
    player = new Player();
    entityManager = new EntityManager();
    renderer = new Renderer(ctx);
    inputManager = new InputManager();
    
    // Load assets
    await loadAssets();
    
    // Initialize audio
    await audioManager.initialize();
    
    // Initialize player position
    player.initializePosition(canvas.width, canvas.height);
    
    // Initialize game environment
    entityManager.initializeEnvironment();
    
    // Hide loading screen
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500);
}

function initializeUIEvents() {
    // Settings button
    settingsBtn.addEventListener('click', openSettings);
    
    // Settings modal
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeSettings();
        }
    });
    
    // Settings actions
    backMenuBtn.addEventListener('click', returnToMenu);
    exitBtn.addEventListener('click', exitGame);
    audioToggleBtn.addEventListener('click', toggleAudio);
    pauseResumeBtn.addEventListener('click', inputManager.togglePause.bind(inputManager));
}

async function loadAssets() {
    return new Promise((resolve) => {
        const assets = [
            { type: 'image', src: 'assets/player.png', onLoad: (img) => playerImage = img },
            { type: 'image', src: 'assets/entity.png', onLoad: (img) => entityImage = img }
        ];
        
        let loadedCount = 0;
        
        assets.forEach(asset => {
            if (asset.type === 'image') {
                const img = new Image();
                img.onload = () => {
                    asset.onLoad(img);
                    loadedCount++;
                    updateLoadingProgress(loadedCount, assets.length);
                    if (loadedCount === assets.length) resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${asset.src}`);
                    loadedCount++;
                    updateLoadingProgress(loadedCount, assets.length);
                    if (loadedCount === assets.length) resolve();
                };
                img.src = asset.src;
            }
        });
        
        // Audio files are loaded by AudioManager
        updateLoadingProgress(2, totalAssets); // Images are 2 of total assets
    });
}

function updateLoadingProgress(loaded, total) {
    const progress = Math.floor((loaded / total) * 100);
    if (loadingProgress) {
        loadingProgress.textContent = `${progress}%`;
    }
}

/**
 * Game State Management Functions
 */
function startTitleAudio() {
    gameState.titleAudioStarted = true;
    if (gameState.audioEnabled) {
        audioManager.play('title');
    }
}

function startGame() {
    gameState.startGame();
    settingsBtn.classList.remove('hidden');
    
    if (gameState.audioEnabled) {
        audioManager.stop('title');
        audioManager.playGameMusic();
    }
    
    player.setMovementEnabled(true);
    inputManager.reset();
}

function restartGame() {
    gameState.reset();
    player.reset();
    player.initializePosition(canvas.width, canvas.height);
    entityManager.reset();
    entityManager.initializeEnvironment();
    inputManager.reset();
    
    settingsBtn.classList.remove('hidden');
    
    startGame();
}

function returnToMenu() {
    audioManager.stopAllMusic();
    audioManager.stopHitSound();
    
    gameState.reset();
    player.reset();
    player.initializePosition(canvas.width, canvas.height);
    entityManager.reset();
    entityManager.initializeEnvironment();
    inputManager.reset();
    
    settingsBtn.classList.add('hidden');
    closeSettings();
    
    if (gameState.audioEnabled) {
        audioManager.play('title');
    }
}

function exitGame() {
    try {
        window.close();
    } catch (error) {
        window.location.href = 'about:blank';
    }
}

function toggleAudio() {
    gameState.audioEnabled = !gameState.audioEnabled;
    audioToggleBtn.textContent = `Audio: ${gameState.audioEnabled ? 'ON' : 'OFF'}`;
    
    if (gameState.audioEnabled) {
        if (gameState.onTitleScreen && gameState.titleAudioStarted) {
            audioManager.play('title');
        } else if (gameState.gameActive) {
            audioManager.playGameMusic();
        }
    } else {
        audioManager.stopAllMusic();
    }
}

/**
 * Settings Modal Functions
 */
function openSettings() {
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
    audioToggleBtn.textContent = `Audio: ${gameState.audioEnabled ? 'ON' : 'OFF'}`;
    pauseResumeBtn.textContent = gameState.paused ? 'Resume Game' : 'Pause Game';
}

function closeSettings() {
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
}

/**
 * Main Game Loop
 */
function gameLoop(currentTime) {
    // Calculate delta time
    const deltaTime = Math.min(100, currentTime - gameState.lastFrameTime);
    gameState.lastFrameTime = currentTime;
    
    // Update music if 10 minutes have passed
    updateMusic(currentTime);
    
    // Update game state
    if (!gameState.paused) {
        player.update(inputManager.keys, canvas.width, canvas.height);
        entityManager.update(deltaTime, player);
    }
    
    // Render game
    renderer.clear();
    
    if (gameState.onTitleScreen) {
        renderer.renderTitleScreen();
    } else {
        renderer.renderGameWorld(entityManager, player, playerImage, entityImage);
        renderer.renderHUD(player);
        
        if (gameState.gameActive) {
            renderer.renderGlitchEffect(player);
        }
        
        if (gameState.gameOver) {
            renderer.renderGameOver();
        }
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

function updateMusic(currentTime) {
    if (!gameState.gameActive || gameState.musicChanged) return;
    
    const elapsed = currentTime - gameState.gameStartTime;
    if (elapsed >= 600000) { // 10 minutes
        gameState.musicChanged = true;
        if (gameState.audioEnabled) {
            audioManager.stop('bgm');
            audioManager.stop('wind');
            audioManager.play('coreDream');
        }
    }
}

/**
 * Error Handling
 */
function showErrorScreen(message) {
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-text" style="color: #ff4444;">Error</div>
                <div class="loading-progress">${message}</div>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-family: 'Press Start 2P', monospace;
                ">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Start the game when the page loads
 */
window.addEventListener('load', initializeGame);

/**
 * Prevent context menu on right-click
 */
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState.gameActive && !gameState.paused) {
        inputManager.togglePause();
    }
});

// Export for debugging
window.gameDebug = {
    gameState,
    player,
    entityManager,
    audioManager
};