import cors from "cors";
import express from "express";
import { createServer } from "http";
import IO from "socket.io";
import * as models from "./models";
import * as mongo from "./mongo";
import * as utils from "./utils";

function subscribeCustomer(path: string): string {
    if (path.startsWith("/products/")) {
        const productId = path.split("/")[2];
        return productId || null;
    }
    return null;
}

const app: express.Application = express();
app.use(cors());

const server = createServer(app);
const io = IO(server);

io.use((socket, next) => {
    if (socket.handshake.query.url) {
        const id = socket.client.id;
        const connection: models.IConnection = {
            _id: id,
            customer: null,
            path: socket.handshake.query.url,
            subscribed: subscribeCustomer(socket.handshake.query.url)
        };
        mongo.createConnection(connection);
        return next();
    }
    next(new Error("Wrong params"));
});

io.on("connection", async (socket) => {
    const id = socket.client.id;
    socket.on("authenticated", async (token) => {
        const user = utils.decryptSafe(token);
        const updated: models.IConnection = {
            _id: id,
            customer: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            path: null,
            subscribed: null
        };
        delete updated.path;
        mongo.updateConnection(updated);
    });
    socket.on("routing", async (path) => {
        const updated: models.IConnection = {
            _id: id,
            customer: null,
            path,
            subscribed: subscribeCustomer(path)
        };
        delete updated.customer;
        mongo.updateConnection(updated);
    });
});

mongo.prepare().then(async () => {
    server.listen(8081, () => {
        console.log(`server started at http://localhost:8081`);
    });
});
