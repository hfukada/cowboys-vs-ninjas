// Game Configuration
const CONFIG = {
    ninjaCount: 100,
    cowboyCount: 100,
    ninjaSpeed: 4,
    cowboySpeed: 1,
    fireRate: 50, // frames between shots
    bulletSpeed: 7,
    ninjaSize: 16,
    cowboySize: 16,
    bulletSize: 4,
    treeDensity: 1.7, // trees per 10000 square pixels (100x100 block)
    gameSpeed: 0.68 // Global speed multiplier (0.8 * 0.85 = 32% slower total)
};
const COUNTDOWNTIME_MS = 30000

// Game State
let canvas, ctx;
let ninjas = [];
let cowboys = [];
let bullets = [];
let trees = [];
let gameRunning = false;
let gameOver = false;
let winner = null;
let lastTime = 0;
let ninjaWins = 0;
let cowboyWins = 0;
let autoRestartTimeout = null;
let splashScreenInterval = null;
let nextGameNinjas = 10;
let nextGameCowboys = 10;
let nextGameTreeDensity = 1;

// Tree Class
class Tree {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
    }

    draw() {
        const x = this.x;
        const y = this.y;

        // Tree trunk (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 4, y + 4, 8, 12);

        // Tree foliage (green circles/rectangles for pixel style)
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(x - 10, y - 8, 20, 12);

        ctx.fillStyle = '#3d7026';
        ctx.fillRect(x - 8, y - 4, 16, 8);

        ctx.fillStyle = '#4a8c2a';
        ctx.fillRect(x - 6, y, 12, 6);
    }

    checkBulletCollision(bullet) {
        return bullet.x > this.x - this.width / 2 &&
               bullet.x < this.x + this.width / 2 &&
               bullet.y > this.y - this.height / 2 &&
               bullet.y < this.y + this.height / 2;
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, targetX, targetY, speed) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.bulletSize;

        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * speed * CONFIG.gameSpeed;
        this.vy = (dy / distance) * speed * CONFIG.gameSpeed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }
}

// Ninja Class
class Ninja {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.ninjaSize;
        this.speed = CONFIG.ninjaSpeed * CONFIG.gameSpeed;
        this.target = null;
        this.alive = true;
    }

    selectTarget() {
        const aliveCowboys = cowboys.filter(c => c.alive);
        if (aliveCowboys.length > 0) {
            this.target = aliveCowboys[Math.floor(Math.random() * aliveCowboys.length)];
        } else {
            this.target = null;
        }
    }

    update() {
        if (!this.alive) return;

        // Check if target is still alive
        if (!this.target || !this.target.alive) {
            this.selectTarget();
        }

        if (this.target) {
            // Move towards target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }

        // Bounce off walls
        if (this.x < this.size / 2) {
            this.x = this.size / 2;
            this.selectTarget(); // Switch target when hitting wall
        }
        if (this.x > canvas.width - this.size / 2) {
            this.x = canvas.width - this.size / 2;
            this.selectTarget();
        }
        if (this.y < this.size / 2) {
            this.y = this.size / 2;
            this.selectTarget();
        }
        if (this.y > canvas.height - this.size / 2) {
            this.y = canvas.height - this.size / 2;
            this.selectTarget();
        }
    }

    draw() {
        if (!this.alive) return;

        const size = this.size;
        const x = this.x;
        const y = this.y;

        // Draw ninja sprite (16x16 pixels)
        // Body (black)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 6, y - 4, 12, 12);

        // Head/mask (dark gray/black)
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(x - 6, y - 8, 12, 6);

        // Eye slit (white eyes)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 6, 2, 2);
        ctx.fillRect(x + 3, y - 6, 2, 2);

        // Headband (red)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x - 6, y - 8, 12, 2);

        // Arms (black)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 8, y - 2, 2, 4);
        ctx.fillRect(x + 6, y - 2, 2, 4);

        // Sword (silver)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(x + 6, y - 4, 4, 1);

        // Legs (black)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 4, y + 6, 3, 2);
        ctx.fillRect(x + 1, y + 6, 3, 2);
    }

    checkCollisionWithCowboy(cowboy) {
        if (!this.alive || !cowboy.alive) return false;

        const dx = this.x - cowboy.x;
        const dy = this.y - cowboy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < (this.size + cowboy.size) / 2;
    }
}

// Cowboy Class
class Cowboy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.cowboySize;
        this.speed = CONFIG.cowboySpeed * CONFIG.gameSpeed;
        this.target = null;
        this.alive = true;
        this.shootTimer = 0;
        this.continuingDirection = null; // {dx, dy} when continuing after wrap
        this.wrappedRecently = false;
    }

    selectTarget() {
        const aliveNinjas = ninjas.filter(n => n.alive);
        if (aliveNinjas.length > 0) {
            this.target = aliveNinjas[Math.floor(Math.random() * aliveNinjas.length)];
        } else {
            this.target = null;
        }
    }

    update() {
        if (!this.alive) return;

        // Check if target is still alive
        if (!this.target || !this.target.alive) {
            this.selectTarget();
        }

        // Check if in middle area of map
        const inMiddleX = this.x > canvas.width * 0.20 && this.x < canvas.width * 0.80;
        const inMiddleY = this.y > canvas.height * 0.20 && this.y < canvas.height * 0.80;
        const inMiddle = inMiddleX && inMiddleY;

        // If we reached the middle after wrapping, select new target and stop continuing
        if (this.continuingDirection && inMiddle) {
            this.continuingDirection = null;
            this.selectTarget();
        }

        // Move behavior
        if (this.continuingDirection) {
            // Continue in the same direction after wrapping
            this.x += this.continuingDirection.dx * this.speed;
            this.y += this.continuingDirection.dy * this.speed;
        } else if (this.target) {
            // Normal behavior: move away from target
            // Calculate shortest distance considering wrap-around
            let dx = this.x - this.target.x;
            let dy = this.y - this.target.y;

            // Check if wrapping around would be shorter
            if (Math.abs(dx) > canvas.width / 2) {
                dx = dx > 0 ? dx - canvas.width : dx + canvas.width;
            }
            if (Math.abs(dy) > canvas.height / 2) {
                dy = dy > 0 ? dy - canvas.height : dy + canvas.height;
            }

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Move in opposite direction of target (away from ninja)
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                this.x += normalizedDx * this.speed;
                this.y += normalizedDy * this.speed;
            }
        }

        // Wrap around screen (Pac-Man style)
        let wrapped = false;
        if (this.x < 0) {
            // Save direction before wrapping
            if (!this.continuingDirection) {
                const dx = this.target ? (this.x - this.target.x) : -1;
                const dy = this.target ? (this.y - this.target.y) : 0;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.continuingDirection = {
                    dx: distance > 0 ? dx / distance : -1,
                    dy: distance > 0 ? dy / distance : 0
                };
            }
            this.x = canvas.width;
            wrapped = true;
        }
        if (this.x > canvas.width) {
            if (!this.continuingDirection) {
                const dx = this.target ? (this.x - this.target.x) : 1;
                const dy = this.target ? (this.y - this.target.y) : 0;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.continuingDirection = {
                    dx: distance > 0 ? dx / distance : 1,
                    dy: distance > 0 ? dy / distance : 0
                };
            }
            this.x = 0;
            wrapped = true;
        }
        if (this.y < 0) {
            if (!this.continuingDirection) {
                const dx = this.target ? (this.x - this.target.x) : 0;
                const dy = this.target ? (this.y - this.target.y) : -1;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.continuingDirection = {
                    dx: distance > 0 ? dx / distance : 0,
                    dy: distance > 0 ? dy / distance : -1
                };
            }
            this.y = canvas.height;
            wrapped = true;
        }
        if (this.y > canvas.height) {
            if (!this.continuingDirection) {
                const dx = this.target ? (this.x - this.target.x) : 0;
                const dy = this.target ? (this.y - this.target.y) : 1;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.continuingDirection = {
                    dx: distance > 0 ? dx / distance : 0,
                    dy: distance > 0 ? dy / distance : 1
                };
            }
            this.y = 0;
            wrapped = true;
        }

        // Shooting logic
        this.shootTimer++;
        if (this.shootTimer >= CONFIG.fireRate / CONFIG.gameSpeed && this.target) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        if (this.target && this.target.alive) {
            const bullet = new Bullet(this.x, this.y, this.target.x, this.target.y, CONFIG.bulletSpeed);
            bullets.push(bullet);
        }
    }

    draw() {
        if (!this.alive) return;

        const size = this.size;
        const x = this.x;
        const y = this.y;

        // Draw cowboy sprite (16x16 pixels)
        // Hat (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 2, y - 10, 4, 2); // Hat top
        ctx.fillRect(x - 6, y - 8, 12, 3); // Hat brim

        // Red bandana
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x - 4, y - 7, 8, 2);

        // Head (peach/skin tone)
        ctx.fillStyle = '#f4a460';
        ctx.fillRect(x - 4, y - 6, 8, 6);

        // Eyes (black)
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 3, y - 4, 2, 2);
        ctx.fillRect(x + 1, y - 4, 2, 2);

        // Mustache (brown)
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 4, y - 1, 8, 2);

        // Body/vest (red)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x - 5, y + 1, 10, 8);

        // Belt (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 5, y + 5, 10, 2);

        // Belt buckle (gold)
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - 1, y + 5, 2, 2);

        // Arms (red)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x - 7, y + 2, 2, 4);
        ctx.fillRect(x + 5, y + 2, 2, 4);

        // Gun (dark gray)
        ctx.fillStyle = '#555';
        ctx.fillRect(x - 9, y + 3, 3, 2);

        // Legs (blue jeans)
        ctx.fillStyle = '#34495e';
        ctx.fillRect(x - 4, y + 9, 3, 4);
        ctx.fillRect(x + 1, y + 9, 3, 4);

        // Boots (brown)
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 4, y + 12, 3, 2);
        ctx.fillRect(x + 1, y + 12, 3, 2);
    }
}

// Load win tallies and balanced settings from server
async function loadWinTallies() {
    try {
        const response = await fetch('/cvn/counts');
        const data = await response.json();
        ninjaWins = data.ninjaWins || 0;
        cowboyWins = data.cowboyWins || 0;
        document.getElementById('ninja-wins').textContent = ninjaWins;
        document.getElementById('cowboy-wins').textContent = cowboyWins;

        // Load balanced tree density from server
        if (data.treeDensity !== undefined) {
            CONFIG.treeDensity = data.treeDensity;
            document.getElementById('tree-density').value = CONFIG.treeDensity;
        }
    } catch (err) {
        console.error('Error loading win tallies:', err);
    }
}

// Initialize game
async function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup controls (no-op now)
    setupControls();

    // Load win tallies from server
    await loadWinTallies();

    // Draw initial state
    drawInitialState();

    // Start animation loop
    requestAnimationFrame(gameLoop);

    // Show splash screen before starting
    startSplashScreen();

    // Auto-start the game after 5 seconds
    setTimeout(startGame, COUNTDOWNTIME_MS);
}

function drawInitialState() {
    // Clear canvas with tan/sand background
    ctx.fillStyle = '#e8d4b0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth - 20;
    canvas.height = container.clientHeight - 20;
}

function setupControls() {
    // No manual controls - game is controlled by API
}

async function fetchNextGameConfig() {
    try {
        const response = await fetch('/cvn/config');
        const config = await response.json();
        nextGameNinjas = config.ninjaCount;
        nextGameCowboys = config.cowboyCount;
        nextGameTreeDensity = config.treeDensity;
    } catch (err) {
        console.error('Error fetching config:', err);
    }
}

function drawSplashScreen() {
    // Clear canvas with tan background
    ctx.fillStyle = '#e8d4b0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT BATTLE', canvas.width / 2, canvas.height / 2 - 100);

    // Draw vs
    ctx.font = 'bold 36px Courier New';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('VS', canvas.width / 2, canvas.height / 2);

    // Draw ninja count
    ctx.font = 'bold 32px Courier New';
    ctx.fillStyle = '#9b59b6';
    ctx.fillText(`🥷 ${nextGameNinjas} Ninjas`, canvas.width / 2 - 150, canvas.height / 2 - 30);

    // Draw cowboy count
    ctx.fillStyle = '#c0392b';
    ctx.fillText(`${nextGameCowboys} Cowboys 🤠`, canvas.width / 2 + 150, canvas.height / 2 - 30);

    // Draw countdown
    ctx.font = 'bold 64px Courier New';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(Math.ceil(splashCountdown), canvas.width / 2, canvas.height / 2 + 80);
}

async function startGame() {
    if (gameRunning) return;

    // Stop splash screen updates
    if (splashScreenInterval) {
        clearInterval(splashScreenInterval);
        splashScreenInterval = null;
    }

    // Fetch configuration from server
    try {
        const response = await fetch('/cvn/config');
        const config = await response.json();

        // Update CONFIG with server values
        CONFIG.ninjaCount = config.ninjaCount;
        CONFIG.cowboyCount = config.cowboyCount;
        CONFIG.treeDensity = config.treeDensity;

        console.log(`Game config loaded - Ninjas: ${CONFIG.ninjaCount}, Cowboys: ${CONFIG.cowboyCount}, Tree Density: ${CONFIG.treeDensity}`);
    } catch (err) {
        console.error('Error fetching config:', err);
        // Fall back to local CONFIG values with minimums
        CONFIG.ninjaCount = Math.max(10, CONFIG.ninjaCount);
        CONFIG.cowboyCount = Math.max(10, CONFIG.cowboyCount);
    }

    // Clear game state but preserve win tally
    ninjas = [];
    cowboys = [];
    bullets = [];
    trees = [];
    gameOver = false;
    winner = null;
    gameRunning = true;

    // Spawn trees randomly across the map based on density
    // treeDensity is trees per 10000 square pixels (100x100 block)
    const canvasArea = canvas.width * canvas.height;
    const treeCount = Math.floor((canvasArea / 10000) * CONFIG.treeDensity);
    for (let i = 0; i < treeCount; i++) {
        const x = Math.random() * (canvas.width - 60) + 30;
        const y = Math.random() * (canvas.height - 60) + 30;
        trees.push(new Tree(x, y));
    }

    // Spawn ninjas randomly on left 45% of screen (leaving 10% middle buffer)
    for (let i = 0; i < CONFIG.ninjaCount; i++) {
        const x = Math.random() * (canvas.width * 0.45 - 40) + 20;
        const y = Math.random() * (canvas.height - 40) + 20;
        ninjas.push(new Ninja(x, y));
    }

    // Spawn cowboys randomly on right 45% of screen (leaving 10% middle buffer)
    for (let i = 0; i < CONFIG.cowboyCount; i++) {
        const x = Math.random() * (canvas.width * 0.45 - 40) + canvas.width * 0.55 + 20;
        const y = Math.random() * (canvas.height - 40) + 20;
        cowboys.push(new Cowboy(x, y));
    }

    // Initial target selection
    ninjas.forEach(ninja => ninja.selectTarget());
    cowboys.forEach(cowboy => cowboy.selectTarget());

    updateStatus('Battle in progress!');
}

async function resetGame() {
    // Cancel any pending auto-restart
    if (autoRestartTimeout) {
        clearTimeout(autoRestartTimeout);
        autoRestartTimeout = null;
    }

    gameRunning = false;
    ninjas = [];
    cowboys = [];
    bullets = [];
    trees = [];
    gameOver = false;
    winner = null;

    // Reset counters on server
    try {
        const response = await fetch('/cvn/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.success) {
            ninjaWins = data.ninjaWins;
            cowboyWins = data.cowboyWins;
            document.getElementById('ninja-wins').textContent = ninjaWins;
            document.getElementById('cowboy-wins').textContent = cowboyWins;
        }
    } catch (err) {
        console.error('Error resetting game:', err);
        ninjaWins = 0;
        cowboyWins = 0;
        document.getElementById('ninja-wins').textContent = ninjaWins;
        document.getElementById('cowboy-wins').textContent = cowboyWins;
    }

    updateStatus('Configure and start the game!');
}

function updateStatus(message) {
    // Update alive counts
    document.getElementById('ninjas-alive').textContent = ninjas.filter(n => n.alive).length;
    document.getElementById('cowboys-alive').textContent = cowboys.filter(c => c.alive).length;
    console.log(message);
}

function checkCollisions() {
    // Check bullet vs ninja and tree collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        let hit = false;

        // Check collision with trees
        for (let tree of trees) {
            if (tree.checkBulletCollision(bullet)) {
                hit = true;
                break;
            }
        }

        if (!hit) {
            // Check collision with ninjas
            for (let ninja of ninjas) {
                if (!ninja.alive) continue;

                const dx = bullet.x - ninja.x;
                const dy = bullet.y - ninja.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < ninja.size / 2) {
                    ninja.alive = false;
                    hit = true;
                    break;
                }
            }
        }

        if (hit || bullet.isOffScreen()) {
            bullets.splice(i, 1);
        }
    }

    // Check ninja vs cowboy collisions
    for (let ninja of ninjas) {
        if (!ninja.alive) continue;

        for (let cowboy of cowboys) {
            if (!cowboy.alive) continue;

            if (ninja.checkCollisionWithCowboy(cowboy)) {
                cowboy.alive = false;
            }
        }
    }
}

async function recordWin(winner) {
    try {
        const response = await fetch('/cvn/win', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ winner })
        });
        const data = await response.json();
        if (data.success) {
            ninjaWins = data.ninjaWins;
            cowboyWins = data.cowboyWins;
            document.getElementById('ninja-wins').textContent = ninjaWins;
            document.getElementById('cowboy-wins').textContent = cowboyWins;

            // Update balanced tree density from server
            if (data.treeDensity !== undefined) {
                CONFIG.treeDensity = data.treeDensity;
                document.getElementById('tree-density').value = CONFIG.treeDensity.toFixed(1);
                console.log(`Tree density adjusted to ${CONFIG.treeDensity.toFixed(1)} for balance`);
            }
        }
    } catch (err) {
        console.error('Error recording win:', err);
    }
}

function checkWinCondition() {
    const aliveNinjas = ninjas.filter(n => n.alive).length;
    const aliveCowboys = cowboys.filter(c => c.alive).length;

    if (aliveNinjas === 0 && aliveCowboys > 0) {
        gameOver = true;
        winner = 'Cowboys';
        cowboyWins++;
        recordWin('Cowboys');
        updateStatus('🤠 Cowboys Win! 🤠');
        gameRunning = false;

        // Show win message for 2 seconds, then splash screen for 5 seconds
        setTimeout(() => {
            startSplashScreen();
        }, 2000);

        // Auto-restart after 7 seconds total (2 + 5)
        autoRestartTimeout = setTimeout(startGame, COUNTDOWNTIME_MS);
    } else if (aliveCowboys === 0 && aliveNinjas > 0) {
        gameOver = true;
        winner = 'Ninjas';
        ninjaWins++;
        recordWin('Ninjas');
        updateStatus('🥷 Ninjas Win! 🥷');
        gameRunning = false;

        // Show win message for 2 seconds, then splash screen for 5 seconds
        setTimeout(() => {
            startSplashScreen();
        }, 2000);

        // Auto-restart after 7 seconds total (2 + 5)
        autoRestartTimeout = setTimeout(startGame, COUNTDOWNTIME_MS);
    }
}

function startSplashScreen() {
    // Reset countdown to 5 seconds
    splashCountdown = COUNTDOWNTIME_MS / 1000;

    // Fetch initial config
    fetchNextGameConfig();

    // Draw splash screen immediately
    drawSplashScreen();

    // Update splash screen every 100ms
    splashScreenInterval = setInterval(() => {
        fetchNextGameConfig();
        splashCountdown -= 0.1;
        drawSplashScreen();
    }, 100);
}

function update() {
    if (!gameRunning || gameOver) return;

    // Update all entities
    ninjas.forEach(ninja => ninja.update());
    cowboys.forEach(cowboy => cowboy.update());
    bullets.forEach(bullet => bullet.update());

    // Check collisions
    checkCollisions();

    // Check win condition
    checkWinCondition();

    // Update UI
    updateStatus(gameOver ? `${winner} Win!` : 'Battle in progress!');
}

function draw() {
    // If splash screen is active, don't draw game
    if (splashScreenInterval) {
        return; // Splash screen is being drawn by its own interval
    }

    // Clear canvas with lighter tan/sand background
    ctx.fillStyle = '#e8d4b0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all entities
    trees.forEach(tree => tree.draw());
    bullets.forEach(bullet => bullet.draw());
    ninjas.forEach(ninja => ninja.draw());
    cowboys.forEach(cowboy => cowboy.draw());

    // Draw game over message
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);

        ctx.fillStyle = winner === 'Ninjas' ? '#9b59b6' : '#e67e22';
        ctx.font = 'bold 48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${winner} Win!`, canvas.width / 2, canvas.height / 2 + 15);
    }
}

function gameLoop(timestamp) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.addEventListener('load', init);
