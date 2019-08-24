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

const secret: string = "wo4Bd8FktL31Ekv8sTbcl33";
const alphabet: string = "4fPwKEjkGrBJst2MpFVZx9y5lIm6A7LDinQzgOhqaWC3obXuv0H1cNde8Y";
const reservedDomains: string[] = ["www", "assets"];
const allowedAssetTypes: string[] = ["jpg", "svg", "png"];

const app: express.Application = express();

function randomString(length: number): string {
    let result: string = "";
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor((Math.random() * 58))];
    }
    return result;
}

function verifyToken(token: string): string {
    if (!token) {
        return "";
    }
    const plainToken = JSON.parse(crypt.decrypt(token));
    if (plainToken.sec !== secret) {
        return "";
    }
    return plainToken.id;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello world!");
});

// login with username and password
app.post("/api/login", async (req, res) => {
    try {
        const user: string = req.body.user;
        const password: string = req.body.password;
        const userData: models.IUser = await mongo.getUserById(user);

        // Check permission
        if (!userData || password !== userData.password) {
            res.sendStatus(401);
            return;
        }

        // Generate tokens
        const key: string = randomString(32);
        const refreshToken: string = crypt.encrypt(JSON.stringify({
            exp: (Date.now() + 604800000),
            id: userData.id,
            key
        }));
        const token: string = crypt.encrypt(JSON.stringify({
            exp: (Date.now() + 1200000),
            id: userData.id,
            sec: secret
        }));
        const response = {
            refreshToken,
            token,
            user: {
                firstName: userData.firstName,
                id: userData.id,
                lastName: userData.lastName
            }
        };

        // Save and return
        const success: boolean = await mongo.addUserTokenById(userData.id, key);
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
app.post("/api/loginwt", async (req, res) => {
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
app.get("/api/verify", async (req, res) => {
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

// get user's subdomains
app.get("/api/domains", async (req, res) => {
    try {
        const user = verifyToken(req.get("token"));
        if (!user) {
            res.sendStatus(401);
            return;
        }
        const domains: models.IDomain[] = await mongo.getDomainsByUser(user);
        res.status(200).send(domains);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

// create new subdomain
app.post("/api/domains/:domain", async (req, res) => {
    try {
        const user = verifyToken(req.get("token"));
        if (!user) {
            res.sendStatus(401);
            return;
        }
        const domain: string = req.params.domain;
        const pageData: models.IPage = req.body;
        const occupied: boolean = await mongo.checkDomain(domain);
        if (occupied || reservedDomains.includes(domain)) {
            res.sendStatus(400);
            return;
        }
        const inserted = await mongo.insertDomain(domain, user, pageData);
        const created = await utils.create(domain);
        if (!inserted || !created) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(e);
        res.sendStatus(500);
    }
});

// Create or update page
app.post("/api/pages/:domain", async (req, res) => {
    try {
        const user = verifyToken(req.get("token"));
        if (!user) {
            res.sendStatus(401);
            return;
        }
        const domain: string = req.params.domain;
        const pageData: models.IPage = req.body;
        const domainData: models.IDomain = await mongo.getDomain(domain);
        const pageIndex = domainData.pages.findIndex((el) => el.name === pageData.name);

        // Check permission
        if (!domainData || domainData.owner !== user) {
            res.sendStatus(400);
            return;
        }

        // Persist
        const saved = pageIndex === -1 ?
            await mongo.addPage(domain, pageData) :
            await mongo.updatePage(domain, pageData);

        // Build
        const built: boolean = await utils.build(domain, pageData.name);
        if (!built) {
            res.sendStatus(500);
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
