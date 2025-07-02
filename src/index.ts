import express from "express";
import { config } from "./config/config";
import { Server } from "socket.io";
import http from "http"
import { SocketConnection } from "./socket/socket";
import cors from "cors"
import pingRoutes from "./routes/pingRoutes"

const app = express()
const server = http.createServer(app)

const corsOptions = {
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    exposedHeaders: ['*', 'Authorization'],
    maxAge: 600
}

app.use(cors(corsOptions))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", pingRoutes)


app.get("/", (req, res) => {
    res.send("Hello hii")
})

server.listen(config.PORT, () => {
    console.log("Server Listening on port " + config.PORT)
})

let io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: config.Origin
    }
})

io.on("connection", (socket) => {
    SocketConnection(socket, io)
    console.log("Socket Connected" + socket.id)
})

io.off("disconnect", (socket) => {
    console.log("Socket Disconnected" + socket.id)
})