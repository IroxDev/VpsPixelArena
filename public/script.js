const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const countdownDisplay = document.getElementById('countdown');
const colorMenu = document.getElementById('colorMenu');
const selectedColorElement = document.getElementById('selectedColor');
let pixelSize = 10;
const cooldownTime = 300; // 5 minutes en secondes
let cooldownEnd = localStorage.getItem('cooldownEnd') || 0;
let pixels = [];
let shadowPixel = null;
let countdownInterval;

// Établir une connexion avec le serveur WebSocket
const socket = new WebSocket('ws://localhost:3000');

socket.addEventListener('open', function (event) {
    console.log('Connecté au serveur amuse toi bien (:');
});

socket.addEventListener('message', function (event) {
    const data = JSON.parse(event.data);
    if (data.type === 'initialPixels') {
        pixels = data.pixels;
        draw();
    } else if (data.type === 'draw') {
        drawPixel(data.pixel, false);
    }
});

canvas.addEventListener('click', function(event) {
    if (isCooldownOver()) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / pixelSize) * pixelSize;
        const y = Math.floor((event.clientY - rect.top) / pixelSize) * pixelSize;
        const color = selectedColorElement.style.backgroundColor;
        drawPixel({ x, y, color }, true);

        const pixelData = { x, y, color };
        socket.send(JSON.stringify({ type: 'draw', pixel: pixelData }));
        startCooldown();
    }
});

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseout', clearShadow);

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / pixelSize) * pixelSize;
    const y = Math.floor((event.clientY - rect.top) / pixelSize) * pixelSize;

    const pixel = pixels.find(p => p.x === x && p.y === y);

    if (!pixel) {
        if (!shadowPixel || shadowPixel.x !== x || shadowPixel.y !== y) {
            shadowPixel = { x, y };
            draw();
        }
    } else if (shadowPixel) {
        shadowPixel = null;
        draw();
    }
}

function drawPixel(pixel, store = true) {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize);
    if (store) {
        const existingPixelIndex = pixels.findIndex(p => p.x === pixel.x && p.y === pixel.y);
        if (existingPixelIndex !== -1) {
            pixels[existingPixelIndex] = pixel;
        } else {
            pixels.push(pixel);
        }
    }
    if (shadowPixel && shadowPixel.x === pixel.x && shadowPixel.y === pixel.y) {
        shadowPixel = null;
    }
    drawShadow();
}

function drawShadow() {
    if (shadowPixel) {
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 2;
        ctx.strokeRect(shadowPixel.x, shadowPixel.y, pixelSize, pixelSize);
    }
}

function clearShadow() {
    shadowPixel = null;
    draw();
}

selectedColorElement.addEventListener('click', function() {
    colorMenu.classList.toggle('active');
});

colorMenu.addEventListener('click', function(event) {
    const color = event.target.dataset.color;
    if (color) {
        selectedColorElement.style.backgroundColor = color;
        colorMenu.classList.remove('active');
    }
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBorder();
    drawExistingPixels();
    drawShadow();
}

function drawBorder() {
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawExistingPixels() {
    pixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize);
    });
}

function startCooldown() {
    clearInterval(countdownInterval); // Efface l'ancien intervalle s'il existe
    cooldownEnd = Date.now() + cooldownTime * 1000;
    localStorage.setItem('cooldownEnd', cooldownEnd);
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 1000); // Met à jour le compte à rebours chaque seconde
}

function updateCountdownDisplay() {
    const remainingTime = cooldownEnd - Date.now();
    if (remainingTime <= 0) {
        clearInterval(countdownInterval); // Arrête le compte à rebours si le temps est écoulé
        countdownDisplay.textContent = 'Prêt à poser un nouveau pixel';
    } else {
        const remainingSeconds = Math.floor(remainingTime / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        countdownDisplay.textContent = `Prochain pixel dans : ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}

function isCooldownOver() {
    const currentTime = Date.now();
    return currentTime > cooldownEnd;
}


draw();
updateCountdownDisplay();
