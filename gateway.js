const WebSocket = require("ws");
const fetch = require("node-fetch");
const http = require("http");

const BASE_API = "https://kingdom-server-production.up.railway.app";

// ================= CONFIG =================
const MAX_PLAYER_PER_SERVER = 100;

// server pool
let servers = [
  { id: 1, players: new Map() }
];

// ================= HTTP SERVER (untuk health Railway) =================
const app = http.createServer((req,res)=>{
  if(req.url === "/"){
    res.writeHead(200);
    res.end("Realtime Server Alive 🚀");
  }
  else if(req.url === "/health"){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:"ok"}));
  }
  else{
    res.writeHead(404);
    res.end();
  }
});

// ================= WEBSOCKET =================
const wss = new WebSocket.Server({ server: app });

// cari server yg belum penuh
function getAvailableServer(){
  let s = servers.find(s => s.players.size < MAX_PLAYER_PER_SERVER);
  
  if(!s){
    const newServer = {
      id: servers.length + 1,
      players: new Map()
    };
    servers.push(newServer);
    console.log("🆕 Server baru dibuat:", newServer.id);
    return newServer;
  }
  return s;
}

// broadcast ke player dalam 1 server
function broadcast(serverId, data){
  const server = servers.find(s => s.id === serverId);
  if(!server) return;

  server.players.forEach(ws=>{
    if(ws.readyState === WebSocket.OPEN){
      ws.send(JSON.stringify(data));
    }
  });
}

// ================= CONNECTION =================
wss.on("connection", (ws)=>{
  console.log("Player connect");

  let player = {
    user: null,
    serverId: null
  };

  ws.on("message", async (msg)=>{
    try{
      const data = JSON.parse(msg);

      // ================= LOGIN =================
      if(data.type === "login"){
        const token = data.token;

        const res = await fetch(BASE_API + "/verify-token",{
          method:"POST",
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({token})
        });

        const result = await res.json();

        if(result.status !== "valid"){
          ws.send(JSON.stringify({type:"login_failed"}));
          return;
        }

        // assign server
        const server = getAvailableServer();
        server.players.set(result.user, ws);

        player.user = result.user;
        player.serverId = server.id;

        ws.send(JSON.stringify({
          type:"login_success",
          serverId: server.id,
          playersOnline: server.players.size
        }));

        broadcast(server.id,{
          type:"player_join",
          user: result.user
        });

        console.log(result.user,"join server",server.id);
      }

      // ================= PLAYER MOVE =================
      if(data.type === "move"){
        broadcast(player.serverId,{
          type:"player_move",
          user: player.user,
          x: data.x,
          y: data.y
        });
      }

      // ================= CHAT =================
      if(data.type === "chat"){
        broadcast(player.serverId,{
          type:"chat",
          user: player.user,
          msg: data.msg
        });
      }

    }catch(err){
      console.log(err);
    }
  });

  // ================= DISCONNECT =================
  ws.on("close", ()=>{
    if(!player.user) return;

    const server = servers.find(s=>s.id===player.serverId);
    if(server){
      server.players.delete(player.user);
      broadcast(player.serverId,{
        type:"player_leave",
        user: player.user
      });
    }

    console.log(player.user,"disconnect");
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("Realtime server running on port", PORT);
});
