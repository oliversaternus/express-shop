import * as crypt from "./crypt";
import * as hashJS from 'hash.js';
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

export function hash(data: string): string {
    const result = hashJS.sha256().update(data).digest('hex');
    return result;
}

export function createUserToken(id: string) {
    return crypt.encrypt(JSON.stringify({
        exp: (Date.now() + 1200000),
        id: id,
        sec: secret
    }));
}

export function createUserRefreshToken(id: string, key: string) {
    return crypt.encrypt(JSON.stringify({
        exp: (Date.now() + 604800000),
        id,
        key
    }));
}
