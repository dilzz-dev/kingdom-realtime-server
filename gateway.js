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

// WORLD MANAGER
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
    console.log("World baru dibuat:", world.id);
  }

  return world;
}

// WEBSOCKET
wss.on("connection", (ws)=>{
  console.log("Client connect");

  ws.on("message", async (msg)=>{
    try{
      const data = JSON.parse(msg);

      // LOGIN
      if(data.type === "login"){
        const res = await axios.post(API_URL + "/verifyToken", {
          token: data.token
        });

        if(!res.data.valid){
          ws.send(JSON.stringify({ type:"error", message:"Token invalid"}));
          ws.close();
          return;
        }

        const player = {
          id: res.data.playerId,
          username: res.data.username,
          ws: ws
        };

        const world = getAvailableWorld();
        world.players.push(player);

        ws.worldId = world.id;
        ws.playerId = player.id;

        ws.send(JSON.stringify({
          type:"login_success",
          worldId: world.id,
          playersOnline: world.players.length
        }));

        console.log(player.username + " masuk world");
      }

      // MOVE
      if(data.type === "move"){
        const world = worlds.find(w => w.id === ws.worldId);
        if(!world) return;

        world.players.forEach(p=>{
          if(p.ws !== ws){
            p.ws.send(JSON.stringify({
              type:"player_move",
              playerId: ws.playerId,
              x:data.x,
              y:data.y
            }));
          }
        });
      }

    }catch(err){
      console.log("Error:", err.message);
    }
  });

  ws.on("close", ()=>{
    const world = worlds.find(w => w.id === ws.worldId);
    if(!world) return;
    world.players = world.players.filter(p => p.id !== ws.playerId);
  });
});

server.listen(PORT, ()=>{
  console.log("Server running on port", PORT);
});
