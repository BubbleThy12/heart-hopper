const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let showTitleScreen = true;
const titleImage = new Image();
titleImage.src = "images/Heart Hopper Gamer Title.png"; // ✅ Make sure this path is correct!
const bgMusic = new Audio("sounds/bg-music.mp3");
bgMusic.loop = true;         // Makes the music loop forever
bgMusic.volume = 0.5;        // Set volume (0.0 to 1.0)
const coinSound = new Audio("sounds/coin.mp3");
coinSound.volume = 0.2; // Optional



let musicMuted = false;

document.getElementById("musicToggle").addEventListener("click", () => {
    musicMuted = !musicMuted;
    bgMusic.muted = musicMuted;
    document.getElementById("musicToggle").textContent = musicMuted ? "Unmute Music" : "Mute Music";
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        bgMusic.pause(); // Pause when tab is hidden
    } else {
        if (!musicMuted) {
            bgMusic.play().catch(e => {
                console.warn("Autoplay blocked on return:", e); 
            });
        }
    }
});





titleImage.onload = () => {
    drawTitleScreen(); // ✅ draw ONLY after image is loaded
};



function drawTitleScreen() {
    if (gameStarted) return; // ⛔ Stop drawing title once game starts

    ctx.drawImage(titleImage, 0, 0, canvas.width, canvas.height);

    // Move clouds...
    clouds.forEach(cloud => {
        cloud.x -= 0.2;
        if (cloud.x < -100) {
            cloud.x = canvas.width + Math.random() * 100;
            cloud.y = Math.random() * 100;
        }
        ctx.drawImage(cloud.img, cloud.x, cloud.y, cloud.width, cloud.height);
    });

    requestAnimationFrame(drawTitleScreen);
}





// === Load Sprite Images ===
const spriteImages = {
    idle: new Image(),
    walk: []
};

spriteImages.idle.src = "images/idle.png";
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `images/walk${i}.png`;
    spriteImages.walk.push(img);
}

const coinFrames = [];
for (let i = 1; i <= 5; i++) { 
    const img = new Image();
    img.src = `images/coin${i}.png`; // Make sure your files are named coin1.png to coin5.png
    coinFrames.push(img);
    img.onload = checkAllImagesLoaded;
}


// === Wait for All Images to Load ===
let imagesToLoad = 1 + spriteImages.walk.length + coinFrames.length;
let imagesLoaded = 0;

function checkAllImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded >= imagesToLoad) {
        console.log("✅ All images loaded, waiting for player to start");
        drawTitleScreen(); // Show the title screen instead of starting game
    }    
}

spriteImages.idle.onload = checkAllImagesLoaded;
spriteImages.walk.forEach(img => {
    img.onload = checkAllImagesLoaded;
});

// === Canvas Setup ===
canvas.width = 800;
canvas.height = 400;

let cameraX = 0; 
let coins = [];
let score = 0; 
let coinFrameIndex = 0;
let projectiles = [];
let coinFrameTimer = 0;
const coinFrameInterval = 6; // Lower = faster spin
let highScore = localStorage.getItem("highScore") || 0;
let clouds = [];
let isPaused = false;
let isGameOver = false;
let animationFrameId = null;
let gameStarted = false;
let gameState = "title"; // 'title' | 'playing' | 'gameover' etc.
let musicStarted = false;
let gameStartTime = null;
let fireballsActivated = false;



function initClouds() {
    clouds = [];
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 2000;
        const y = Math.random() * 100;
        const scale = 0.8 + Math.random() * 1.2;
        clouds.push(new Cloud(x, y, scale));
    }
}


// === Helper Classes ===
class GameObject {
    constructor(x, y, width, height, color, type = "normal") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.type = type;
    }

    draw(ctx) {
        if (this === player) {
            const sprite = player.isJumping || player.speedX === 0
                ? spriteImages.idle
                : spriteImages.walk[player.frameIndex];

            const drawX = this.x;
            const drawY = this.y;
            const width = this.width;
            const height = this.height;

            ctx.save();
            if (player.facing === "left") {
                ctx.translate(drawX + width / 2, 0);
                ctx.scale(-1, 1);
                ctx.translate(-drawX - width / 2, 0);
            }
            ctx.drawImage(sprite, drawX, drawY, width, height);
            ctx.restore();

        } else if (this.type === "spike") {
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.closePath();
            ctx.fill();


        } else if (this.color === "gold") {
            const frame = coinFrames[coinFrameIndex];
            ctx.drawImage(frame, this.x, this.y, this.width, this.height);
        }
         else {
            const radius = 8;
            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.fillStyle = this.color;
            roundRect(ctx, this.x - 1, this.y - 1, this.width + 2, this.height + 2, radius);
            ctx.stroke();
            roundRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.fill();
        }
    }
}


function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawCloud(ctx, x, y, scale = 1) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 25 * scale, y - 10 * scale, 25 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 50 * scale, y, 30 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
}

function isColliding(player, object) {
    return (
        player.x < object.x + object.width &&
        player.x + player.width > object.x &&
        player.y < object.y + object.height &&
        player.y + player.height > object.y
    );
}

// === Player ===
const player = new GameObject(110, 310, 45, 60, "red");
player.speedX = 0;
player.moveSpeed = 2.5;
player.speedY = 0;
player.gravity = 0.35;
player.jumpPower = -8.5;
player.jumpCount = 0;
player.maxJumps = 2;
player.frameIndex = 0;
player.frameTimer = 0;
player.frameInterval = 8;
player.facing = "right";

player.canJump = function () {
    return this.jumpCount < this.maxJumps;
};

player.jump = function () {
    this.speedY = this.jumpPower;
    this.isJumping = true;
    this.jumpCount++;
};


// === Platforms ===
const platforms = [];
let lastPlatformX = 0;

// === Controls ===
document.addEventListener("keydown", (event) => {
    if (!gameStarted) return;

    // ▶️ Start music on first movement
    if (!musicStarted && (event.code === "ArrowRight" || event.code === "ArrowLeft")) {
        if (!musicMuted) {
            bgMusic.play().catch(e => console.warn("Music play error:", e));
        }
        musicStarted = true;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
        tryJump();
    }

});

function tryJump() {
  if (player.canJump()) {
    player.jump();
  }
}



canvas.addEventListener("touchstart", function (e) {
    e.preventDefault(); // Stop browser from scrolling

    // ✅ Start game if it hasn't started yet
    if (!gameStarted) {
        startGame();
        return;
    }

    // ✅ Jump / double jump if game is running
    if (player.onGround || player.jumpCount < player.maxJumps) {
        player.velocityY = -player.jumpStrength;
        player.jumpCount++;
    }

    tryJump();
}, { passive: false });





// === Cloud Class ===
class Cloud {
    constructor(x, y, scale = 1) {
        this.x = x;
        this.y = y;
        this.scale = scale;
    }

    draw(ctx) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 30 * this.scale, 20 * this.scale, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + 25 * this.scale, this.y - 10 * this.scale, 25 * this.scale, 15 * this.scale, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + 50 * this.scale, this.y, 30 * this.scale, 20 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}




class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.opacity = 1;

        const angle = Math.atan2(targetY - y, targetX - x);
        const speed = 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= 0.01;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isOffScreen() {
        return this.opacity <= 0 || this.x + this.width < 0 || this.y > canvas.height || this.y + this.height < 0;
    }
}


// === Drawing ===
function drawGame() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#aee2ff");
    gradient.addColorStop(0.7, "#fdfdff");
    gradient.addColorStop(1, "#ffe6f7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds (moving with camera)
    clouds.forEach(cloud => cloud.draw(ctx));

    drawCloud(ctx, 100, 80, 1.2);
    drawCloud(ctx, 300, 50, 0.9);
    drawCloud(ctx, 550, 100, 1.5);
    drawCloud(ctx, 750, 70, 1.1);

    ctx.save();
    ctx.translate(-cameraX, 0);
    projectiles.forEach(p => p.draw(ctx));
    player.draw(ctx);
    platforms.forEach(p => p.draw(ctx));
    coins.forEach(c => c.draw(ctx));
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.strokeStyle = "#aaa";
    ctx.fillRect(8, 8, 120, 30);
    ctx.strokeRect(8, 8, 120, 30);
    ctx.fillStyle = "#333";
    ctx.font = "16px 'Comic Sans MS', sans-serif";
    ctx.fillText("Score: " + score, 14, 28);

    ctx.fillStyle = "white";
    ctx.fillRect(canvas.width - 150, 8, 140, 30);
    ctx.strokeRect(canvas.width - 150, 8, 140, 30);
    ctx.fillStyle = "#333";
    ctx.textAlign = "right";
    ctx.fillText("High Score: " + highScore, canvas.width - 20, 28);
    ctx.textAlign = "left";

        // Dim screen if paused
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "24px 'Comic Sans MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "left";
    }


    requestAnimationFrame(drawGame);
}

function isCoinFullyOverlapped(player, coin) {
    const coinCenterX = coin.x + coin.width / 2;
    const coinCenterY = coin.y + coin.height / 2;

    // Check if the coin center is inside the player's rectangle        
    return (
        coinCenterX > player.x &&
        coinCenterX < player.x + player.width &&            
        coinCenterY > player.y &&
        coinCenterY < player.y + player.height
    );
}



 


// === Update Logic ===
function updateGame() {
    if (!gameStarted) {
        drawTitleScreen(); // Draw title screen with clouds
        requestAnimationFrame(updateGame);
        return;
    }
    
    if (isPaused || isGameOver) return;

    // === Player movement and animation ===
    const maxHorizontalSpeed = 3;
    const maxFallSpeed = 8;

    if (player.speedX > maxHorizontalSpeed) player.speedX = maxHorizontalSpeed;
    if (player.speedX < -maxHorizontalSpeed) player.speedX = -maxHorizontalSpeed;

    if (player.speedY > maxFallSpeed) player.speedY = maxFallSpeed;

    player.y += player.speedY;
    player.speedX = player.moveSpeed; // Always move right
    player.x += player.speedX;
    player.speedY += player.gravity;

    if (!player.isJumping && player.speedX !== 0) {
        player.frameTimer++;
        if (player.frameTimer >= player.frameInterval) {
            player.frameIndex = (player.frameIndex + 1) % spriteImages.walk.length;
            player.frameTimer = 0;
        }
    } else {
        player.frameIndex = 0;
    }

    // === Camera ===
    const desiredCameraX = player.x - canvas.width / 2 + player.width / 2;
    if (desiredCameraX > cameraX) cameraX = desiredCameraX;
    cameraX = Math.max(0, cameraX);
    if (player.x < 0) player.x = 0;

    // === Platform collision ===
    let onPlatform = false;
    platforms.forEach(platform => {
        if (isColliding(player, platform)) {
            if (player.y + player.height - player.speedY <= platform.y) {
                player.y = platform.y - player.height;
                player.speedY = 0;
                onPlatform = true;
            }
        }
    });

    if (onPlatform) {
        player.isJumping = false;   
        player.jumpCount = 0;
    }

    // === Coin logic ===
    coins = coins.filter(coin => {
        if (isCoinFullyOverlapped(player, coin)) {
            score += 1;

            // 🔊 Play coin sound
            coinSound.currentTime = 0;
            coinSound.play();

            if (score > highScore) {
                highScore = score;
                localStorage.setItem("highScore", highScore);
            }
            return false;
        }
        return true;
    });


    coins.forEach(coin => {
        coin.frameTimer++;
        if (coin.frameTimer >= coin.frameInterval) {
            coin.frameIndex = (coin.frameIndex + 1) % coinFrames.length;
            coin.frameTimer = 0;
        }
    });

    // === Generate platforms dynamically ===
    while (lastPlatformX < cameraX + canvas.width + 200) {
        generatePlatform();
    }

    // === Death condition: falling off screen ===
    if (player.y > canvas.height + 100) {
        resetGame();
        return;
    }



    // === Fireball collisions ===
    for (const p of projectiles) {
        if (isColliding(player, p)) {
            resetGame();
            return;
        }
    }



    // === Cloud parallax ===
    clouds.forEach(cloud => {
        cloud.x -= 0.2;
        if (cloud.x < cameraX - 100) {
            cloud.x = cameraX + canvas.width + 100;
            cloud.y = Math.random() * 100;
        }
    });

    // === Update and clean up projectiles ===
    projectiles.forEach(p => p.update());
    projectiles = projectiles.filter(p => !p.isOffScreen()); 

    // === Coin animation frame update ===
    coinFrameTimer++;
    if (coinFrameTimer >= coinFrameInterval) {
        coinFrameIndex = (coinFrameIndex + 1) % coinFrames.length;      
        coinFrameTimer = 0;
    }

    // === Activate fireballs after 15 seconds ===
    const timeSinceStart = Date.now() - gameStartTime;
    if (timeSinceStart > 15000) {
        fireballsActivated = true;
    }

    // === Spawn new fireballs occasionally ===
    if (fireballsActivated && cameraX > 1000) {
        if (Math.random() < 0.01) {
            const startX = cameraX + canvas.width + 100;
            const startY = Math.random() * canvas.height;
            projectiles.push(new Projectile(startX, startY, player.x, player.y));
        }
    }
  

    // 🔁 Continue the update loop
    animationFrameId = requestAnimationFrame(updateGame);
}

// === Platform Generation ===
function generatePlatform() {
    const progress = (lastPlatformX - 600) / 1000;
    const difficulty = Math.min(progress, 5);

    const baseWidth = 150;
    const minWidth = 50;
    const widthReduction = difficulty * 10;
    const platformWidth = Math.max(minWidth, baseWidth - widthReduction + Math.random() * 20);  

    const minGap = 130 + difficulty * 5;
    const maxGap = 200 + difficulty * 10;
    const gap = Math.random() * (maxGap - minGap) + minGap;

    const prevPlatform = platforms[platforms.length - 1];
    const newX = prevPlatform.x + gap;

    const verticalSwing = 80 + difficulty * 5;
    const direction = Math.random() < 0.5 ? -1 : 1;
    let newY = prevPlatform.y + direction * Math.random() * verticalSwing;
    newY = Math.max(100, Math.min(280, newY));


    const pastelColors = ["#a0e7e5", "#b4f8c8", "#fbe7c6", "#ffcbf2", "#caffbf"];
    const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];

    const platform = new GameObject(newX, newY, platformWidth, 10, color);
    platforms.push(platform);


    const coinCount = Math.random() < 0.8 ? Math.floor(Math.random() * 4) + 1 : 0;
    const spacing = platformWidth / (coinCount + 1);
    for (let i = 0; i < coinCount; i++) {
        const coinX = newX + spacing * (i + 1) - 5;
        const coinY = newY - 25;

        // Check if this coin overlaps any spike
        const overlapsSpike = platforms.some(p =>
            p.type === "spike" &&
            coinX < p.x + p.width &&
            coinX + 10 > p.x &&
            coinY < p.y + p.height &&
            coinY + 10 > p.y
        );

        if (!overlapsSpike) {
            coins.push(new GameObject(coinX, coinY, 20, 20, "gold"));
        }
    }


    lastPlatformX = newX;
}


function gameOver() {
    isGameOver = true; // Optional flag for animations or pausing updates

    // Optional: Add visual effect or sound here

    setTimeout(() => {
        isGameOver = false;
        resetGame();
    }, 1000); // Wait 1 second before resetting
}




// === Reset Game ===
function resetGame() {
    if (isGameOver) return; // ⛔ Prevent multiple resets

    // ✅ CANCEL PREVIOUS LOOP
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    isGameOver = true; // ✅ Set game over flag early

    bgMusic.pause();
    bgMusic.currentTime = 0;
    if (!musicMuted) {
        bgMusic.play().catch(e => console.warn("Autoplay error:", e));
    }
   

    // Reset music flag so it can start again on player movement
    musicStarted = true;

    // Reset game state flags
    isGameOver = false;
    isPaused = false;
    gameStartTime = Date.now();
    fireballsActivated = false;


    // Reset player properties
    player.x = 110 + 20;
    player.y = 340 - player.height;
    player.speedX = 0;
    player.speedY = 0;
    player.isJumping = false;
    player.jumpCount = 0;
    player.facing = "right";
    player.frameIndex = 0;
    player.frameTimer = 0;
    
    // Reset camera and game objects
    cameraX = 0;
    score = 0;
    platforms.length = 0;
    coins.length = 0;
    projectiles.length = 0;
    
    // Recreate starting platform
    const pastelColors = ["#a0e7e5", "#b4f8c8", "#fbe7c6", "#ffcbf2", "#caffbf"];
    const startX = 110;
    const startY = 340;
    const firstColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
    const firstPlatform = new GameObject(startX, startY, 130, 10, firstColor);
    platforms.push(firstPlatform);
    lastPlatformX = startX + 130;
    
    // Generate two extra platforms
    for (let i = 0; i < 2; i++) {
        const gap = Math.random() * 40 + 60;
        const x = lastPlatformX + gap;
        const y = 200 + Math.random() * 200;
        const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
        platforms.push(new GameObject(x, y, 130, 10, color));
        lastPlatformX = x + 130;
    }

    gameStartTime = Date.now();
    fireballsActivated = false;
    
    // Reset clouds using reusable function
    initClouds();
    
    // Start game loop cleanly
    requestAnimationFrame(updateGame);
}


function startGame() {
    if (!musicMuted) {
        bgMusic.play().catch(e => console.warn("Autoplay error:", e));
    }
    musicStarted = true;

    gameStarted = true;
    resetGame();
    drawGame();
}



//resetGame();   // Calls updateGame from within
//drawGame();    // Starts drawing loop


document.getElementById("resetHighScore").addEventListener("click", () => {
    localStorage.removeItem("highScore");
    highScore = 0;
});

document.getElementById("pauseButton").addEventListener("click", () => {
    isPaused = !isPaused;
    document.getElementById("pauseButton").textContent = isPaused ? "Resume" : "Pause";
    if (isPaused) {
        bgMusic.pause(); // ✅ Add this line
    } else {
        if (!musicMuted) bgMusic.play().catch(e => console.warn("Music play error:", e)); // ✅ Resume if not muted
        updateGame();
    }
});



function drawTitleScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // optional: fill background to avoid transparency issues
    ctx.fillStyle = "#87ceeb"; // sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    clouds.forEach(cloud => {
        cloud.x -= 0.2;
        cloud.draw(ctx);
    });
    
    // draw the title image
    ctx.drawImage(titleImage, 0, 0, canvas.width, canvas.height);

    
}


initClouds();
titleImage.onload = () => {
    drawTitleScreen();
};

canvas.addEventListener("click", () => {
    if (!gameStarted) {
        startGame();
    }
});


titleImage.onload = () => {
    console.log("✅ Image loaded");
    drawTitleScreen();
};

titleImage.onerror = () => {
    console.error("❌ Failed to load title image");
};


