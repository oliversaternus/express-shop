import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import path from "path";
import util from "util";
import * as auth from "./auth";
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
app.post("/api/admins/login",
    auth.loginAdmin,
    async (req, res) => {
        const admin = res.locals.admin;

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

        // Save refreshToken
        const saved: boolean = await mongo.addAdminSessionToken(admin._id, key);
        saved ? res.status(200).send(response) : res.sendStatus(500);
    });

// admin login with refresh-token
app.post("/api/admins/refresh", async (req, res) => {
    const refreshToken: string = req.body.token;

    if (!refreshToken) {
        res.sendStatus(401);
        return;
    }

    // Check session token
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
});

// admin update
app.put("/api/admins",
    auth.loginAdmin,
    async (req, res) => {
        const admin = res.locals.admin;
        const updated: models.IAdmin = {
            _id: admin._id,
            access: admin.access,
            name,
            password: req.body.newPW ? utils.hash(req.body.newPW) : admin.password,
            sessionTokens: []
        };

        const success = await mongo.updateAdmin(updated);
        res.sendStatus(success ? 200 : 500);
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

// Create product
app.put("/api/products",
    auth.verifyAdmin,
    async (req, res) => {
        const product: models.IProduct = req.body as models.IProduct;
        product._id = null;
        const created = await mongo.createProduct(product);
        created ? res.status(200).send(created) : res.sendStatus(400);
    });

// Update product
app.put("/api/products/:id",
    auth.verifyAdmin,
    async (req, res) => {
        const product: models.IProduct = req.body as models.IProduct;
        const updated = await mongo.updateProduct(product);
        res.sendStatus(updated ? 200 : 500);
    });

// Delete product
app.delete("/api/products/:id",
    auth.verifyAdmin,
    async (req, res) => {
        const id: string = req.params.id;
        const deleted: boolean = await mongo.deleteProduct(id);
        res.sendStatus(deleted ? 200 : 500);
    });

// Get all products paged and filtered by categories
app.post("/api/products",
    async (req, res) => {
        const searchCategories: models.ISearchCategories = req.body as models.ISearchCategories;
        const products: models.IProduct[] = await mongo.getProducts(searchCategories);
        res.status(200).send(products);
    });

// Upload product image
app.post("/api/products/:id/images",
    auth.verifyAdmin,
    async (req, res) => {
        const id = req.params.id;
        const image = req.files.image;
        const fileName: string = utils.generateId() + ".jpg";

        // Save image
        const saved = await util.promisify((image as UploadedFile).mv)(
            path.join(__dirname, "../", "/images", "/" + fileName));

        // Update database
        const success = await mongo.addProductImage(id, fileName);

        res.sendStatus(200);
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
app.post("/api/customers/login",
    auth.loginCustomer,
    async (req, res) => {
        const customer = res.locals.customer;

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

        // Save
        const success: boolean = await mongo.addCustomerSessionToken(customer._id, key);
        success ? res.status(200).send(response) : res.sendStatus(500);
    });

// customer login with refresh-token
app.post("/api/customers/refresh", async (req, res) => {
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
});

// checks if credentials are valid
app.get("/api/customers/verify", async (req, res) => {
    const success = utils.verifyUser(req.get("token"));
    if (!success) {
        res.sendStatus(401);
        return;
    }
    res.sendStatus(200);
});

// customer update
app.put("/api/customers",
    auth.loginCustomer,
    async (req, res) => {
        const customer = res.locals.customer;
        const updated: models.ICustomer = {
            ...customer, ...req.body, id: customer._id
        };

        const success = await mongo.updateCustomer(updated);
        res.sendStatus(success ? 200 : 500);
    });

app.use((err: any, req: any, res: any, next: any) => {
    res.status(Number(err.message) || 500);
    res.send();
});

mongo.prepare().then(async () => {
    app.listen(8080, () => {
        console.log(`server started at http://localhost:8080`);
    });
});
