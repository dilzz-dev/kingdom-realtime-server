let serverCount = 0

async function createGameServer(){
    serverCount++

    const newServer = {
        id: "server-"+serverCount,
        ip: "game-"+serverCount+".up.railway.app",
        players: 0
    }

    console.log("Server baru dibuat:", newServer.id)
    return newServer
}

module.exports = { createGameServer }
