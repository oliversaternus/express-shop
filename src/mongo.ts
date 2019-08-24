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
