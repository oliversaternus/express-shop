import crypto from "crypto";

const ENCRYPTION_KEY = "Q5mere2Bjfp99cnvAkf2Fbewcsh6yYo1"; // Must be 256 bytes (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string) {
 const iv = crypto.randomBytes(IV_LENGTH);
 const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
 let encrypted = cipher.update(text);

 encrypted = Buffer.concat([encrypted, cipher.final()]);

 return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string) {
 const textParts = text.split(":");
 const iv = Buffer.from(textParts.shift(), "hex");
 const encryptedText = Buffer.from(textParts.join(":"), "hex");
 const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
 let decrypted = decipher.update(encryptedText);

 decrypted = Buffer.concat([decrypted, decipher.final()]);

 return decrypted.toString();
}
