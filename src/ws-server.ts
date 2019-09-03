import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import IO from "socket.io";
import * as models from "./models/models";
import * as mongo from "./tools/mongo";
import * as utils from "./tools/utils";

const wsKey = utils.wsKey;
const app: express.Application = express();
app.use(bodyParser.json());
app.use(cors());

app.post("/update", (req, res) => {
    const key = req.get("key");
    if (key !== wsKey) {
        res.sendStatus(401);
        return;
    }
    const product = req.body;
    io.emit("update", product);
    res.sendStatus(200);
});

const server = createServer(app);
const io = IO(server);

io.use((socket, next) => {
    if (socket.handshake.query.url) {
        const id = socket.client.id;
        const connection: models.IConnection = {
            _id: id,
            customer: null,
            ip: socket.handshake.address
        };
        mongo.createConnection(connection);
        return next();
    }
    next(new Error("Wrong params"));
});

io.on("connection", async (socket) => {
    const id = socket.client.id;
    socket.on("authenticated", (token) => {
        const user = utils.decryptSafe(token);
        const updated: models.IConnection = {
            _id: id,
            customer: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            ip: null
        };
        mongo.updateConnection(updated);
    });
    socket.on("disconnect", () => {
        mongo.deleteConnection(socket.client.id);
    });
});

mongo.prepare().then(async () => {
    server.listen(4143, () => {
        console.log(`server started at http://localhost:4143`);
    });
});
