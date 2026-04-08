const WebSocket = require("ws");
const axios = require("axios");

const PORT = process.env.PORT || 3000;
const BASE_API = "https://kingdom-server-production.up.railway.app";

// batas player per server
const MAX_PLAYERS = 100;

// memory realtime server
let players = {};
let serverId = process.env.SERVER_ID || "Server-1";

const wss = new WebSocket.Server({ port: PORT });

console.log("🌍 WebSocket running on port", PORT);
console.log("🛰 Server ID:", serverId);

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Player connected");

  // server full check
  if (Object.keys(players).length >= MAX_PLAYERS) {
    ws.send(JSON.stringify({ type: "SERVER_FULL" }));
    ws.close();
    return;
  }

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);

      // LOGIN PLAYER
      if (data.type === "LOGIN") {
        const username = data.username;

        players[username] = {
          username,
          gold: 0,
          lastUpdate: Date.now()
        };

        ws.username = username;

        ws.send(JSON.stringify({
          type: "LOGIN_SUCCESS",
          server: serverId,
          onlinePlayers: Object.keys(players).length
        }));

        broadcast({
          type: "PLAYER_JOIN",
          username,
          total: Object.keys(players).length
        });
      }

      // PLAYER EARN GOLD
      if (data.type === "EARN_GOLD") {
        const username = ws.username;
        if (!username) return;

        players[username].gold += data.amount;

        // sync ke API Railway
        await axios.post(`${BASE_API}/updateGold`, {
          username: username,
          gold: players[username].gold
        });

        ws.send(JSON.stringify({
          type: "GOLD_UPDATED",
          gold: players[username].gold
        }));
      }

      // BUILD / ACTION LOG
      if (data.type === "ACTION_LOG") {
        await axios.post(`${BASE_API}/addLog`, {
          username: ws.username,
          action: data.action,
          amount: data.amount || 0,
          time: Date.now()
        });
      }

      // PING KEEP ALIVE
      if (data.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      }

    } catch (err) {
      console.log("Error:", err.message);
    }
  });

  ws.on("close", () => {
    if (!ws.username) return;

    delete players[ws.username];

    broadcast({
      type: "PLAYER_LEAVE",
      username: ws.username,
      total: Object.keys(players).length
    });

    console.log(ws.username, "disconnected");
  });
});
