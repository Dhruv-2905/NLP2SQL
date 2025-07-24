import CryptoJS from "crypto-js";

export const decryptToken = (encryptedToken: string, secretKey: string) => {
  try {
    const decodedKey = CryptoJS.enc.Utf8.parse(secretKey);
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, decodedKey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Error decrypting token:", error);
    return null;
  }
};
