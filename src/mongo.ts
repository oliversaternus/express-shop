import { MongoClient } from "mongodb";
import * as models from "./models";
const url: string = "mongodb://127.0.0.1:27017/";
let conn: any;

export async function prepare(): Promise<boolean> {
    try {
        conn = await MongoClient.connect(url, { useNewUrlParser: true });
        return true;
    } catch (e) {
        return false;
    }
}

export async function initialize(): Promise<boolean> {
    try {
        conn = await MongoClient.connect(url, { useNewUrlParser: true });

        // drop all collections
        await conn.db("express-shop").collection("customers").drop();
        await conn.db("express-shop").collection("products").drop();
        await conn.db("express-shop").collection("admins").drop();
        await conn.db("express-shop").collection("pending_customers").drop();

        // create collections
        await conn.db("express-shop").createCollection("customers");
        await conn.db("express-shop").createCollection("products");
        await conn.db("express-shop").createCollection("admins");
        await conn.db("express-shop").createCollection("pending_customers");

        // create index
        const res = await conn.db("express-shop").collection("pending_customers")
            .createIndex({ date: 1 }, { expireAfterSeconds: 1200 });
        return !!res;
    } catch (e) {
        return false;
    }
}

/*
*
*
*
************************************ CUSTOMERS **************************************
*
*
*
*/

export async function createCustomer(customer: models.ICustomer): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .insertOne(customer);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

export async function deleteCustomer(__id: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .deleteOne({ __id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateCustomer(customer: models.ICustomer): Promise<boolean> {
    let updateParams = { ...customer };
    delete updateParams.sessionTokens;
    delete updateParams.purchased;
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id: customer.__id }, { ...customer });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function logoutCustomer(__id: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { sessionTokens: [] });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function addCustomerSessionToken(__id: string, token: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { $push: { sessionTokens: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeCustomerSessionToken(__id: string, token: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { $pull: { sessionTokens: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function getCustomers(): Promise<models.ICustomer[]> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .find({}, { projection: { password: 0, sessionTokens: 0, cart: 0, purchased: 0 } }).toArray();
        return res as models.ICustomer[];

    } catch (e) {
        return null;
    }
}

export async function getCustomer(__id: string): Promise<models.ICustomer> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .findOne({ __id }, { projection: { password: 0 } });
        return res as models.ICustomer;

    } catch (e) {
        return null;
    }
}

export async function addToCart(__id: string, product: models.IProduct) {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { $push: { cart: product } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeFromCart(__id: string, cartId: string) {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { $pull: { cart: { cartId } } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function purchase(__id: string) {
    try {
        const items = (await conn.db("express-shop").collection("customers")
            .findOne({ __id }, { projection: { cart: 1 } })).cart.map((item: any) => {
                return {
                    date: Date.now(),
                    product: item.product,
                    purchaseId: item.cartId + Date.now()
                };
            });
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ __id }, { $push: { purchased: { $each: items } }, cart: [] });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

/*
*
*
*
************************************ PRODUCTS **************************************
*
*
*
*/

export async function createProduct(product: models.IProduct): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("products")
            .insertOne(product);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

export async function deleteProduct(__id: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("products")
            .deleteOne({ __id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateProduct(product: models.IProduct): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("products")
            .updateOne({ __id: product.__id }, { ...product });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function getProducts(catergories: any): Promise<models.IProduct[]> {
    try {
        const res = await conn.db("express-shop").collection("products")
            .find({}).toArray();
        return res as models.IProduct[];

    } catch (e) {
        return null;
    }
}

export async function getProduct(__id: string): Promise<models.IProduct> {
    try {
        const res = await conn.db("express-shop").collection("products")
            .findOne({ __id });
        return res as models.IProduct;

    } catch (e) {
        return null;
    }
}

/*
*
*
*
************************************ ADMINS **************************************
*
*
*
*/

export async function createAdmin(admin: models.IAdmin): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .insertOne(admin);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

export async function deleteAdmin(__id: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .deleteOne({ __id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateAdmin(admin: models.IAdmin): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .updateOne({ __id: admin.__id }, { ...admin });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function getAdmins(): Promise<models.IAdmin[]> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .find({}).toArray();
        return res as models.IAdmin[];

    } catch (e) {
        return null;
    }
}

export async function getAdmin(__id: string): Promise<models.IAdmin> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .findOne({ __id });
        return res as models.IAdmin;

    } catch (e) {
        return null;
    }
}

/*
*
*
*
************************************ PENDING CUSTOMERS **************************************
*
*
*
*/

export async function createPendingCustomer(customer: models.IPendingCustomer): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("pending_customers")
            .insertOne(customer);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

export async function deletePendingCustomer(__id: string): Promise<boolean> {
    try {
        const res = await conn.db("express-shop").collection("pending_customers")
            .deleteOne({ __id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function getPendingCustomers(): Promise<models.IPendingCustomer[]> {
    try {
        const res = await conn.db("express-shop").collection("pending_customers")
            .find({}).toArray();
        return res as models.IPendingCustomer[];

    } catch (e) {
        return null;
    }
}

export async function getPendingCustomer(__id: string): Promise<models.IPendingCustomer> {
    try {
        const res = await conn.db("express-shop").collection("pending_customers")
            .findOne({ __id });
        return res as models.IPendingCustomer;

    } catch (e) {
        return null;
    }
}
