import fs from "fs";
import path from "path";
import * as models from "./models";
import * as mongo from "./mongo";
import * as templates from "./templates";

export const buildPath = path.join(__dirname, "..", "build");

export async function build(domain: string, page: string): Promise<boolean> {

    try {
        const pageData: models.IPage = await mongo.getPage(domain, page);
        const generator = templates.generator(pageData.template);
        if (fs.existsSync(path.join(buildPath, domain, page + ".html"))) {
            fs.unlinkSync(path.join(buildPath, domain, page + ".html"));
        }
        fs.writeFileSync(
            path.join(buildPath, domain, page + ".html"),
            generator(pageData));
        return true;
    } catch (e) {
        return false;
    }

}

export async function create(domain: string): Promise<boolean> {

    try {
        const page = "index";
        const pageData: models.IPage = await mongo.getPage(domain, page);
        const generator = templates.generator(pageData.template);
        fs.mkdirSync(path.join(buildPath, domain));
        fs.mkdirSync(path.join(buildPath, domain, "assets"));
        fs.writeFileSync(
            path.join(buildPath, domain, page + ".html"),
            generator(pageData));
        return true;
    } catch (e) {
        return false;
    }

}
