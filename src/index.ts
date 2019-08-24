import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import path from "path";
import util from "util";
import * as crypt from "./crypt";
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

// login with username and password
app.post("/api/customers/login", async (req, res) => {
    try {
        const email: string = req.body.email;
        const password: string = req.body.password;
        const hash: string = utils.hash(password);
        let customer: models.ICustomer = await mongo.getCustomer(email);

        // Check permission
        if (!customer || hash !== customer.password) {
            res.sendStatus(401);
            return;
        }

        // Generate tokens
        const key: string = utils.randomString(32);
        const refreshToken: string = utils.createUserRefreshToken(customer.__id, key);
        const token: string = utils.createUserToken(customer.__id);

        // Craft response data
        delete customer.password;
        delete customer.sessionTokens;
        const response = {
            refreshToken,
            token,
            customer
        };

        // Save and return
        const success: boolean = await mongo.addCustomerSessionToken(customer.__id, key);
        if (!success) {
            res.sendStatus(500);
            return;
        }
        res.status(200).send(response);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

// login with refresh-token
app.post("/api/customers/refresh", async (req, res) => {
    try {
        const refreshToken: string = req.body.refreshToken;

        if (!refreshToken) {
            res.sendStatus(401);
            return;
        }

        // Check permission
        const plainToken = JSON.parse(crypt.decrypt(refreshToken));
        const userData: models.IUser = await mongo.getUserById(plainToken.id);
        if (!userData.refresh.includes(plainToken.key)) {
            res.sendStatus(401);
            return;
        }

        // Generate token
        const token: string = crypt.encrypt(JSON.stringify({
            exp: (Date.now() + 1200000),
            id: userData.id,
            sec: secret
        }));
        const response = {
            token,
            user: {
                firstName: userData.firstName,
                id: userData.id,
                lastName: userData.lastName
            }
        };

        res.status(200).send(response);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

// verify token
app.get("/api/customers/verify", async (req, res) => {
    try {
        const success = verifyToken(req.get("token"));
        if (!success) {
            res.sendStatus(401);
            return;
        }
        res.sendStatus(200);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

// Upload image
app.post("/api/images/:domain", async (req, res) => {
    try {
        const user = verifyToken(req.get("token"));
        if (!user) {
            res.sendStatus(401);
            return;
        }
        const domain = req.params.domain;
        const image = req.files.image;
        const name: string = req.body.name;
        const type: string = req.body.type;
        const domainData: models.IDomain = await mongo.getDomain(domain);

        // Check permissions
        if (domainData.owner !== user) {
            res.sendStatus(401);
            return;
        }

        // Check if name exists or is already taken and if type is valid
        if (!name ||
            domainData.assets.findIndex((el: models.IAsset) => el.name === name && el.type === type) !== -1 ||
            !allowedAssetTypes.includes(type)) {
            res.sendStatus(400);
            return;
        }

        // Save image to appropriate folder
        const saved = await util.promisify((image as UploadedFile).mv)(
            path.join(utils.buildPath, domain, "assets", name.replace(/\./g, "") + "." + type));

        // Update database
        const success = await mongo.addAsset(domain, { name, type });

        res.sendStatus(200);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

mongo.prepare().then(async () => {
    app.listen(8080, () => {
        // tslint:disable-next-line:no-console
        console.log(`server started at http://localhost:8080`);
    });
});
