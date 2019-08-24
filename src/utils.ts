import * as crypt from "./crypt";
const secret: string = "wo4Bd8FktL31Ekv8sTbcl33";
const alphabet: string = "4fPwKEjkGrBJst2MpFVZx9y5lIm6A7LDinQzgOhqaWC3obXuv0H1cNde8Y";

export function randomString(length: number): string {
    let result: string = "";
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor((Math.random() * 58))];
    }
    return result;
}

export function verifyToken(token: string): string {
    if (!token) {
        return "";
    }
    const plainToken = JSON.parse(crypt.decrypt(token));
    if (plainToken.sec !== secret) {
        return "";
    }
    return plainToken.id;
}
