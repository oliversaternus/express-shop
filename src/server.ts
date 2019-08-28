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

/*
*
*
*
************************************ ADMINS **************************************
*
*
*
*/

// admin login with username and password
app.post("/api/admins/login", async (req, res) => {
    try {
        const name: string = req.body.name;
        const password: string = req.body.password;
        const hash: string = utils.hash(password);
        const admin: models.IAdmin = await mongo.getAdmin(name);

        // Check permission
        if (!admin || hash !== admin.password) {
            res.sendStatus(401);
            return;
        }

        // Generate tokens
        const key: string = utils.randomString(32);
        const refreshToken: string = utils.createAdminRefreshToken(admin.name, key);
        const token: string = utils.createAdminToken(admin.name, admin.access);

        // Craft response data
        delete admin.password;
        delete admin.sessionTokens;
        const response = {
            admin,
            refreshToken,
            token
        };

        // Save and return
        const success: boolean = await mongo.addAdminSessionToken(admin._id, key);
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

// admin login with refresh-token
app.post("/api/admins/refresh", async (req, res) => {
    try {
        const refreshToken: string = req.body.token;

        if (!refreshToken) {
            res.sendStatus(401);
            return;
        }

        // Check permission
        const plainToken: any = utils.decrypt(refreshToken);
        const admin: models.IAdmin = await mongo.getAdmin(plainToken.name);
        if (!admin.sessionTokens.includes(plainToken.key)) {
            res.sendStatus(401);
            return;
        }

        // Craft response data
        const token: string = utils.createAdminToken(plainToken.name, admin.access);
        delete admin.password;
        delete admin.sessionTokens;
        const response = {
            admin,
            token
        };

        res.status(200).send(response);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// admin update
app.put("/api/admins", async (req, res) => {
    try {
        const name: string = req.body.name;
        const password: string = req.body.password;
        const admin = await mongo.getAdmin(name);

        // check permission
        if (utils.hash(password) !== admin.password) {
            res.sendStatus(401);
            return;
        }

        const updated: models.IAdmin = {
            _id: admin._id,
            access: admin.access,
            name,
            password: req.body.newPW ? utils.hash(req.body.newPW) : admin.password,
            sessionTokens: []
        };

        const success = await mongo.updateAdmin(updated);
        if (!success) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

/*
*
*
*
************************************ PRODUCTS **************************************
*
*
*
*/

// Upload product image
app.post("/api/products/:id/images", async (req, res) => {
    try {
        // verify credentials
        const admin = utils.verifyAdmin(req.get("token"));
        if (!admin) {
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

// Create product
app.post("/api/products", async (req, res) => {
    try {
        // verify credentials
        const admin = utils.verifyAdmin(req.get("token"));
        if (!admin) {
            res.sendStatus(401);
            return;
        }

        const product: models.IProduct = req.body as models.IProduct;
        product._id = null;
        const created = await mongo.createProduct(product);

        if (!created) {
            res.sendStatus(400);
            return;
        }
        res.status(200).send(created);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
    try {
        // verify credentials
        const admin = utils.verifyAdmin(req.get("token"));
        if (!admin) {
            res.sendStatus(401);
            return;
        }

        const product: models.IProduct = req.body as models.IProduct;
        console.log(product);
        const updated = await mongo.updateProduct(product);
        console.log(updated);

        if (!updated) {
            res.sendStatus(400);
            return;
        }
        res.status(200).send(updated);

    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
    try {
        // verify credentials
        const admin = utils.verifyAdmin(req.get("token"));
        if (!admin) {
            res.sendStatus(401);
            return;
        }
        const id = req.params.id;
        const success = await mongo.deleteProduct(id);

        if (!success) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

// Get all products paged and filtered by categories
app.get("/api/products", async (req, res) => {
    try {
        const products: any = await mongo.getProducts({}, 0, 100);
        res.status(200).send(products);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

/*
*
*
*
************************************ CUSTOMERS **************************************
*
*
*
*/

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
        const success: boolean = await mongo.addCustomerSessionToken(customer._id, key);
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
        const success = utils.verifyUser(req.get("token"));
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

// customer update
app.put("/api/customers", async (req, res) => {
    try {
        const email: string = req.body.email;
        const password: string = req.body.password;
        const customer: models.ICustomer = await mongo.getCustomer(email);

        // check permission
        if (utils.hash(password) !== customer.password) {
            res.sendStatus(401);
            return;
        }

        const updated: models.ICustomer = {
            _id: customer._id,
            cart: customer.cart,
            city: req.body.city ? req.body.city : customer.city,
            country: req.body.country ? req.body.country : customer.country,
            email,
            firstName: req.body.firstName ? req.body.firstName : customer.firstName,
            houseNumber: req.body.houseNumber ? req.body.houseNumber : customer.houseNumber,
            lastName: req.body.lastName ? req.body.lastName : customer.lastName,
            password: req.body.newPW ? utils.hash(req.body.newPW) : customer.password,
            postalCode: req.body.postalCode ? req.body.postalCode : customer.postalCode,
            purchased: [],
            sessionTokens: [],
            street: req.body.street ? req.body.street : customer.street
        };

        const success = await mongo.updateCustomer(updated);
        if (!success) {
            res.sendStatus(500);
            return;
        }
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
