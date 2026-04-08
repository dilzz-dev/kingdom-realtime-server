const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const API_URL = "https://kingdom-server-production.up.railway.app";

app.get("/", (req,res)=>{
  res.send("Realtime Server Running 🚀");
});

// ================= WORLD MANAGER =================
let worlds = [];
const MAX_PLAYER = 100;

function getAvailableWorld(){
  let world = worlds.find(w => w.players.length < MAX_PLAYER);

  if(!world){
    world = {
      id: uuidv4(),
      players:[]
    };
    worlds.push(world);
    console.log("World dibuat:", world.id);
  }

  return world;
}

// ================= VERIFY TOKEN =================
async function verifyToken(token){
  try{
    const res = await axios.post(API_URL + "/verify-token", { token });
    if(res.data.status === "valid") return res.data.user;
    return null;
  }catch(err){
    console.log("Verify token error:", err.message);
    return null;
  }
}

// ================= WEBSOCKET =================
wss.on("connection", (ws)=>{
  console.log("Client connected");

  ws.on("message", async (msg)=>{
    try{
      const data = JSON.parse(msg);

      // ===== LOGIN =====
      if(data.type === "login"){
        const username = await verifyToken(data.token);

        if(!username){
          ws.send(JSON.stringify({ type:"error", message:"Token invalid"}));
          ws.close();
          return;
        }

        const world = getAvailableWorld();

        const player = {
          id: uuidv4(),
          username,
          ws
        };

        world.players.push(player);
        ws.worldId = world.id;
        ws.playerId = player.id;
        ws.username = username;

        ws.send(JSON.stringify({
          type:"login_success",
          worldId: world.id,
          playersOnline: world.players.length
        }));

        console.log(username + " join world " + world.id);
      }

      // ===== MOVE =====
      if(data.type === "move"){
        const world = worlds.find(w => w.id === ws.worldId);
        if(!world) return;

        world.players.forEach(p=>{
          if(p.ws !== ws && p.ws.readyState === WebSocket.OPEN){
            p.ws.send(JSON.stringify({
              type:"player_move",
              player: ws.username,
              x:data.x,
              y:data.y
            }));
          }
        });
      }

    }catch(err){
      console.log("WS Error:", err.message);
    }
  });

  ws.on("close", ()=>{
    const world = worlds.find(w => w.id === ws.worldId);
    if(!world) return;

    world.players = world.players.filter(p => p.id !== ws.playerId);
    console.log("Player disconnected");
  });
});

// 🔥 WAJIB untuk Railway
server.listen(PORT, ()=>{
  console.log("Realtime server running on port", PORT);
});
