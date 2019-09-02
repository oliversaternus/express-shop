import cors from "cors";
import express from "express";
import { createServer } from "http";
import IO from "socket.io";
import * as models from "./models";
import * as mongo from "./mongo";
import * as utils from "./utils";

const app: express.Application = express();
app.use(cors());
const server = createServer(app);
const io = IO(server);

function onProductUpdated(product: models.IProduct) {
    io.emit("update", product);
}

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

mongo.setOnProductUpdate(onProductUpdated);
mongo.prepare().then(async () => {
    server.listen(8081, () => {
        console.log(`server started at http://localhost:8081`);
    });
});
