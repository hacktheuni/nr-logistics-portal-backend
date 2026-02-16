import CryptoJS from 'crypto-js';
import { config } from '@/config/env';

const SECRET_KEY = config.encryptionKey;

if (!SECRET_KEY) {
    // We'll throw an error if the key isn't set, TO ensure security.
    // However, during the script run, we might be setting it.
    // But for the app runtime, it must be there.
    console.warn("WARNING: ENCRYPTION_KEY is not set in environment variables.");
}

export const encrypt = (text: string): string => {
    if (!SECRET_KEY) throw new Error("Encryption key not found");
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (cipherText: string): string => {
    if (!SECRET_KEY) throw new Error("Encryption key not found");
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};
