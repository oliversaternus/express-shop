import { MongoClient, ObjectID } from "mongodb";
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

function buildSearchConfig(categories: models.ISearchCategories): any {
    let result: any = {};
    for (let key in categories) {
        if (categories.hasOwnProperty(key)) {
            switch (key) {
                case 'tags':
                    if (!categories.tags) { break; }
                    result.tags = { $in: categories.tags };
                    break;
                case 'price':
                    if (!categories.price) { break; }
                    result.price = { $gt: categories.price[0], $lt: categories.price[1] };
                    break;
                case 'keyword':
                    if (!categories.keyword) { break; }
                    const regex = new RegExp(categories.keyword, 'i');
                    result.$or = [{ name: regex }, { description_short: regex }];
                    break;
            }
        }
    }
    return result;
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
        return res.ops[0];

    } catch (e) {
        return false;
    }
}

export async function deleteCustomer(id: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .deleteOne({ _id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateCustomer(customer: models.ICustomer): Promise<boolean> {
    const _id = new ObjectID(customer._id);
    const updateParams = { ...customer };
    delete updateParams.sessionTokens;
    delete updateParams.purchased;
    try {
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $set: { ...updateParams } });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function logoutCustomer(id: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { sessionTokens: [] });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function addCustomerSessionToken(id: string, token: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $push: { sessionTokens: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeCustomerSessionToken(id: string, token: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $pull: { sessionTokens: token } });
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

export async function getCustomer(email: string): Promise<models.ICustomer> {
    try {
        const res = await conn.db("express-shop").collection("customers")
            .findOne({ email }, { projection: { password: 0 } });
        return res as models.ICustomer;

    } catch (e) {
        return null;
    }
}

export async function addToCart(id: string, product: models.IProduct) {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $push: { cart: product } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeFromCart(id: string, cartId: string) {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $pull: { cart: { cartId } } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function purchase(id: string) {
    try {
        const _id = new ObjectID(id);
        const items = (await conn.db("express-shop").collection("customers")
            .findOne({ _id }, { projection: { cart: 1 } })).cart.map((item: any) => {
                return {
                    date: Date.now(),
                    product: item.product,
                    purchaseId: item.cartId + Date.now()
                };
            });
        const res = await conn.db("express-shop").collection("customers")
            .updateOne({ _id }, { $push: { purchased: { $each: items } }, cart: [] });
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
        return res.ops[0];

    } catch (e) {
        return false;
    }
}

export async function deleteProduct(id: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("products")
            .deleteOne({ _id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateProduct(product: models.IProduct): Promise<boolean> {
    try {
        const updateParams = { ...product };
        const _id = new ObjectID(product._id);
        delete updateParams._id;
        const res = await conn.db("express-shop").collection("products")
            .updateOne({ _id }, { $set: { ...updateParams } });
        return !!res.result.nModified;

    } catch (e) {
        console.log(e);
        return false;
    }
}

export async function addProductImage(id: string, image: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("products")
            .updateOne({ _id }, { $push: { images: image } });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function getProducts(categories: models.ISearchCategories): Promise<models.IProduct[]> {
    try {
        const { page, pageSize } = categories;
        const searchConfig = buildSearchConfig(categories);
        const res = await conn.db("express-shop").collection("products")
            .find(searchConfig).sort().skip(page * pageSize).limit(pageSize).toArray();
        return res as models.IProduct[];
    } catch (e) {
        return null;
    }
}

export async function getProduct(id: string): Promise<models.IProduct> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("products")
            .findOne({ _id });
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
        return res.ops[0];

    } catch (e) {
        return false;
    }
}

export async function deleteAdmin(id: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("admins")
            .deleteOne({ _id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

export async function updateAdmin(admin: models.IAdmin): Promise<boolean> {
    try {
        const updateParams = { ...admin };
        delete updateParams.sessionTokens;
        const _id = new ObjectID(admin._id);
        const res = await conn.db("express-shop").collection("admins")
            .updateOne({ _id }, { $set: { ...updateParams } });
        return !!res.result.nModified;

    } catch (e) {
        console.log(e);
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

export async function getAdmin(name: string): Promise<models.IAdmin> {
    try {
        const res = await conn.db("express-shop").collection("admins")
            .findOne({ name });
        return res as models.IAdmin;

    } catch (e) {
        return null;
    }
}

export async function addAdminSessionToken(id: string, token: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("admins")
            .updateOne({ _id }, { $push: { sessionTokens: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeAdminSessionToken(id: string, token: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("admins")
            .updateOne({ _id }, { $pull: { sessionTokens: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
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
        return res.ops[0];

    } catch (e) {
        return false;
    }
}

export async function deletePendingCustomer(id: string): Promise<boolean> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("pending_customers")
            .deleteOne({ _id });
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

export async function getPendingCustomer(id: string): Promise<models.IPendingCustomer> {
    try {
        const _id = new ObjectID(id);
        const res = await conn.db("express-shop").collection("pending_customers")
            .findOne({ _id });
        return res as models.IPendingCustomer;

    } catch (e) {
        return null;
    }
}
