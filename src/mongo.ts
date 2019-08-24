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

/*#############################  USERS  ##################################*/

export async function insertUser(user: models.IUser): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("users").insertOne(user);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

export async function updateUserPasswordById(id: string, password: string): Promise<boolean> {
    if (!password) {
        return false;
    }
    try {
        const res = await conn.db("blogscape").collection("users").updateOne({ id }, { $set: { password } });
        return !!res.result.nModified;

    } catch (e) {
        return false;
    }
}

export async function addUserTokenById(id: string, token: string): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("users").updateOne({ id }, { $push: { refresh: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function removeUserTokenById(id: string, token: string): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("users").updateOne({ id }, { $pull: { refresh: token } });
        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function getAllUsers(): Promise<models.IUser[]> {
    try {
        const res = await conn.db("blogscape").collection("users").find({}, { projection: { _id: 0 } }).toArray();
        return res as models.IUser[];

    } catch (e) {
        return null;
    }
}

export async function getUserById(id: string): Promise<models.IUser> {
    try {
        const res = await conn.db("blogscape").collection("users").findOne({ id }, { projection: { _id: 0 } });
        return res as models.IUser;

    } catch (e) {
        return null;
    }
}

export async function removeUserById(id: string): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("users").deleteOne({ id });
        return !!res.deletedCount;

    } catch (e) {
        return false;
    }
}

/*############################  DOMAINS  ##############################*/

export async function checkDomain(id: string): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("domains").findOne({ id });
        return !!res;

    } catch (e) {
        return false;
    }
}

export async function getDomain(id: string): Promise<models.IDomain> {
    try {
        const res = await conn.db("blogscape").collection("domains").findOne({ id });
        return res as models.IDomain;

    } catch (e) {
        return null;
    }
}

export async function getDomainsByUser(user: string): Promise<models.IDomain[]> {
    try {
        const res = await conn.db("blogscape").collection("domains").find({ owner: user }).toArray();
        return res as models.IDomain[];

    } catch (e) {
        return null;
    }
}

export async function insertDomain(id: string, owner: string, page: models.IPage): Promise<boolean> {
    try {
        const initPage: models.IPage = {
            data: page.data,
            metaData: page.metaData,
            name: "index",
            template: page.template
        };
        const initialDomain: models.IDomain = {
            assets: [],
            id,
            owner,
            pages: [initPage]
        };
        const res = await conn.db("blogscape").collection("domains").insertOne(initialDomain);
        return !!res.insertedCount;

    } catch (e) {
        return false;
    }
}

/*############################  PAGES  ##############################*/

export async function getPage(domain: string, page: string): Promise<models.IPage> {
    try {
        const res = await conn.db("blogscape").collection("domains").findOne({ id: domain });
        if (!res) {
            return null;
        }
        const resP = res.pages.find((el: any) => el.name === page);
        if (!resP) {
            return null;
        }
        return resP as models.IPage;
    } catch (e) {
        return null;
    }
}

export async function updatePage(domain: string, page: models.IPage): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("domains").updateOne(
            {
                "id": domain,
                "pages.name": page.name
            },
            {
                $set: {
                    "pages.$": page
                }
            }
        );

        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

export async function addPage(domain: string, page: models.IPage): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("domains").updateOne(
            {
                id: domain
            },
            {
                $push: {
                    pages: page
                }
            }
        );

        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

/*############################  ASSETS  ##############################*/

export async function addAsset(domain: string, asset: models.IAsset): Promise<boolean> {
    try {
        const res = await conn.db("blogscape").collection("domains").updateOne(
            {
                id: domain
            },
            {
                $push: {
                    assets: asset
                }
            }
        );

        return !!res.result.nModified;
    } catch (e) {
        return false;
    }
}

/*####################################### CUSTOMERS ###################################### */

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
