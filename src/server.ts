import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import path from "path";
import util from "util";
import * as models from "./models";
import * as mongo from "./mongo";
import * as utils from "./utils";

const app: express.Application = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello world!");
});

// customer login with username and password
app.post("/api/customers/login", async (req, res) => {
    try {
        const email: string = req.body.email;
        const password: string = req.body.password;
        const hash: string = utils.hash(password);
        const customer: models.ICustomer = await mongo.getCustomer(email);

        // Check permission
        if (!customer || hash !== customer.password) {
            res.sendStatus(401);
            return;
        }

        // Generate tokens
        const key: string = utils.randomString(32);
        const refreshToken: string = utils.createUserRefreshToken(customer.email, key);
        const token: string = utils.createUserToken(customer.email);

        // Craft response data
        delete customer.password;
        delete customer.sessionTokens;
        const response = {
            customer,
            refreshToken,
            token
        };

        // Save and return
        const success: boolean = await mongo.addCustomerSessionToken(customer.__id, key);
        if (!success) {
            res.sendStatus(500);
            return;
        }
        res.status(200).send(response);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// customer login with refresh-token
app.post("/api/customers/refresh", async (req, res) => {
    try {
        const refreshToken: string = req.body.token;

        if (!refreshToken) {
            res.sendStatus(401);
            return;
        }

        // Check permission
        const plainToken: any = utils.decrypt(refreshToken);
        const customer: models.ICustomer = await mongo.getCustomer(plainToken.email);
        if (!customer.sessionTokens.includes(plainToken.key)) {
            res.sendStatus(401);
            return;
        }

        // Craft response data
        const token: string = utils.createUserToken(plainToken.email);
        delete customer.password;
        delete customer.sessionTokens;
        const response = {
            customer,
            token
        };

        res.status(200).send(response);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// checks if credentials are valid
app.get("/api/customers/verify", async (req, res) => {
    try {
        const success = utils.verifyToken(req.get("token"));
        if (!success) {
            res.sendStatus(401);
            return;
        }
        res.sendStatus(200);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// Upload product image
app.put("/api/products/:id/images", async (req, res) => {
    try {
        // verify credentials
        const user = utils.verifyToken(req.get("token"));
        if (!user) {
            res.sendStatus(401);
            return;
        }

        // prepare data
        const id = req.params.id;
        const image = req.files.image;
        const name: string = req.body.name;
        const description: string = req.body.description;
        const fileName: string = utils.generateId() + ".jpg";

        // Save image
        const saved = await util.promisify((image as UploadedFile).mv)(
            path.join(__dirname, "../", "/images", "/" + fileName));

        // Update database
        const success = await mongo.addProductImage(id, fileName);

        res.sendStatus(200);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

mongo.prepare().then(async () => {
    app.listen(8080, () => {
        console.log(`server started at http://localhost:8080`);
    });
});
