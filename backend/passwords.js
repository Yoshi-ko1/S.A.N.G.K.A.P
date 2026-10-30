// Password hashing with scrypt (built into Node, no packages needed).
const crypto = require("node:crypto");

function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 64);
    return "scrypt$" + salt.toString("hex") + "$" + key.toString("hex");
}

function verifyPassword(password, stored) {
    const [scheme, saltHex, keyHex] = String(stored).split("$");
    if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
    const expected = Buffer.from(keyHex, "hex");
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
