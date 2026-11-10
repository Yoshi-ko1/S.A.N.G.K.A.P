// Saves uploaded pictures (recipe photos and profile pictures) into assets/uploads/.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "assets", "uploads");
const MAX_BYTES = 2 * 1024 * 1024;          // 2 MB per picture (the browser shrinks pictures first)
const PREFIXES = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];

function userError(message) {
    const e = new Error(message);
    e.userMessage = message;
    return e;
}

// Look at the first bytes of the file, so a renamed non-picture file is refused.
function detectType(buf) {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
    if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
    return null;
}

// dataUrl looks like "data:image/jpeg;base64,/9j/4AAQ..."  Returns "assets/uploads/<random>.jpg".
function saveImage(dataUrl) {
    const text = String(dataUrl || "");
    const prefix = PREFIXES.find(p => text.startsWith(p));
    if (!prefix) throw userError("Choose a JPG, PNG or WebP picture.");
    const base64 = text.slice(prefix.length);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw userError("That picture could not be read.");

    const buf = Buffer.from(base64, "base64");
    if (buf.length === 0) throw userError("That picture is empty.");
    if (buf.length > MAX_BYTES) throw userError("That picture is too large. The limit is 2 MB.");
    const ext = detectType(buf);
    if (!ext) throw userError("That file is not a real JPG, PNG or WebP picture.");

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = crypto.randomBytes(16).toString("hex") + "." + ext;   // random name, never the user's file name
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf, { flag: "wx" });
    return "assets/uploads/" + name;
}

// Simple limit: 30 uploads per hour per visitor address. Stops someone filling the disk.
const hits = new Map();
function allowUpload(address) {
    const now = Date.now();
    const entry = hits.get(address);
    if (!entry || now > entry.reset) { hits.set(address, { count: 1, reset: now + 3600e3 }); return true; }
    entry.count += 1;
    return entry.count <= 30;
}

module.exports = { saveImage, allowUpload };
