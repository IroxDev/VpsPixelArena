const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

let pixels = [];
let cooldowns = {};

try {
    const ipFileContent = fs.readFileSync('ip.json');
    cooldowns = JSON.parse(ipFileContent);
} catch (error) {
    console.log("", error);
}

function saveCooldowns() {
    fs.writeFile('ip.json', JSON.stringify(cooldowns), (err) => {
        if (err) {
            console.error("", err);
        }
    });
}

function setCooldownEnd(ip, cooldownEnd) {
    cooldowns[ip] = cooldownEnd;
    saveCooldowns();
}

function updateCooldown(ip, cooldownTime) {
    const cooldownEnd = Date.now() + cooldownTime * 1000;
    setCooldownEnd(ip, cooldownEnd);
}

function updateAllCooldowns(cooldownTime) {
    Object.keys(cooldowns).forEach((ip) => {
        updateCooldown(ip, cooldownTime);
    });
}

function sendInitialData(ws) {
    ws.send(JSON.stringify({ type: 'initialPixels', pixels }));
    const ip = ws._socket.remoteAddress;
    const cooldownEnd = cooldowns[ip] || 0;
    ws.send(JSON.stringify({ type: 'cooldownEnd', cooldownEnd }));
}

function sendCooldownEnd() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            const ip = client._socket.remoteAddress;
            const cooldownEnd = cooldowns[ip] || 0;
            client.send(JSON.stringify({ type: 'cooldownEnd', cooldownEnd }));
        }
    });
}

wss.on('connection', (ws, req) => {
    console.log('Un utilisateur est connecté');

    const ip = req.connection.remoteAddress;

    if (!cooldowns[ip]) {
        cooldowns[ip] = Date.now();
        saveCooldowns();
    }

    sendInitialData(ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'draw') {
            cooldowns[ip] = Date.now() + 300000;
            saveCooldowns();
        }
    });

    ws.on('close', () => {
        console.log('Un utilisateur est déconnecté');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Le serveur est en cours d'écoute sur le port ${PORT}`);
});

function updateCooldowns() {
    setInterval(() => {
        sendCooldownEnd();
    }, 1000);
}
updateCooldowns();
