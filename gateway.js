      require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { createGameServer } = require("./serverManager")
const { sendTokenEmail } = require("./mailer")

const app = express()
app.use(cors())
app.use(express.json())

let activeServers = []
const MAX
