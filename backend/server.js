// S.A.N.G.K.A.P. web server: serves the website and a JSON API backed by SQL Server.
// Run:  npm start     then open  http://localhost:3000
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { connect, q, transaction } = require("./db");
const { hashPassword, verifyPassword } = require("./passwords");
const { saveImage, allowUpload } = require("./uploads");

const ROOT = path.join(__dirname, "..");
const SESSION_DAYS = 14;
const WEIGHTS = { essential: 3, important: 2, optional: 1 };
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

/* The website uses ids like USR001 and REC001; the database uses plain numbers. */
const pad = n => String(n).padStart(3, "0");
const userKey = n => "USR" + pad(n);
const recipeKey = n => "REC" + pad(n);
const ratingKey = (u, r) => "RATE" + (u * 10000 + r);
function parseKey(prefix, value) {
    const m = String(value).match(new RegExp("^" + prefix + "(\\d+)$"));
    return m ? Number(m[1]) : fail(400, "Bad id.");
}
const iso = d => (d instanceof Date ? d.toISOString() : d);
const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);

/* ---------- request helpers ---------- */
function readBody(req, limit = 1e6) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", c => { data += c; if (data.length > limit) { reject(new HttpError(413, "Request too large.")); req.destroy(); } });
        req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new HttpError(400, "Invalid JSON.")); } });
    });
}
function send(res, status, body, headers = {}) {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
    res.end(JSON.stringify(body));
}
function getCookie(req, name) {
    const m = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(name + "="));
    return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
async function currentUser(req) {
    const token = getCookie(req, "sangkap_session");
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    const rows = await q(`SELECT u.* FROM dbo.sessions s JOIN dbo.users u ON u.id = s.user_id
                          WHERE s.token = @t AND s.expires_at > SYSUTCDATETIME()`, { t: token });
    return rows[0] || null;
}
async function requireUser(req) { return (await currentUser(req)) || fail(401, "Log in first."); }

function publicUser(u, includeEmail) {
    const out = { id: userKey(u.id), username: u.username, displayName: u.display_name,
                  profileImage: u.profile_image, role: u.role, dateCreated: iso(u.created_at) };
    if (includeEmail) out.email = u.email;
    return out;
}

/* ---------- recipes ---------- */
async function loadRecipes(onlyId = null) {
    const where = onlyId ? "WHERE r.id = @id" : "";
    const p = onlyId ? { id: onlyId } : {};
    const recipes = await q(`SELECT r.*, s.rating_avg, s.rating_count FROM dbo.recipes r
                             JOIN dbo.recipe_stats s ON s.recipe_id = r.id ${where} ORDER BY r.id`, p);
    const sub = onlyId ? "WHERE recipe_id = @id" : "";
    const ings = await q(`SELECT recipe_id, name, importance, weight FROM dbo.recipe_ingredients ${sub} ORDER BY id`, p);
    const steps = await q(`SELECT recipe_id, instruction FROM dbo.recipe_steps ${sub} ORDER BY recipe_id, step_number`, p);
    const tags = await q(`SELECT recipe_id, tag FROM dbo.recipe_tags ${sub}`, p);
    const group = (rows, fn) => { const m = new Map(); rows.forEach(r => { if (!m.has(r.recipe_id)) m.set(r.recipe_id, []); m.get(r.recipe_id).push(fn(r)); }); return m; };
    const gi = group(ings, i => ({ name: i.name, importance: i.importance, weight: i.weight }));
    const gs = group(steps, s => s.instruction);
    const gt = group(tags, t => t.tag);
    return recipes.map(r => ({
        id: recipeKey(r.id), title: r.title, description: r.description, image: r.image, category: r.category,
        cookingTime: r.cooking_time, difficulty: r.difficulty,
        authorId: r.author_id ? userKey(r.author_id) : null, authorName: r.author_name,
        communityRecipe: !!r.is_community, rating: Number(r.rating_avg), ratingCount: r.rating_count,
        baseRatingTotal: Number(r.base_rating_total), baseRatingCount: r.base_rating_count,
        dateCreated: iso(r.created_at),
        ingredients: gi.get(r.id) || [], instructions: gs.get(r.id) || [], tags: gt.get(r.id) || []
    }));
}
function validateRecipe(b) {
    const title = str(b.title, 120);
    if (title.length < 3) fail(400, "Give the recipe a name of at least 3 characters.");
    const cookingTime = parseInt(b.cookingTime, 10);
    if (!(cookingTime >= 1 && cookingTime <= 600)) fail(400, "Cooking time must be 1 to 600 minutes.");
    const difficulty = ["Easy", "Medium", "Hard"].includes(b.difficulty) ? b.difficulty : "Easy";
    const ingredients = (Array.isArray(b.ingredients) ? b.ingredients : [])
        .map(i => ({ name: str(i && i.name, 80).toLowerCase(), importance: WEIGHTS[i && i.importance] ? i.importance : "important" }))
        .filter(i => i.name);
    if (ingredients.length < 1) fail(400, "Add at least one ingredient.");
    const instructions = (Array.isArray(b.instructions) ? b.instructions : []).map(s => str(s, 1000)).filter(Boolean);
    if (instructions.length < 1) fail(400, "Add at least one instruction step.");
    const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map(t => str(t, 30).toLowerCase()).filter(Boolean))].slice(0, 10);
    return { title, description: str(b.description, 500), image: str(b.image, 500), category: str(b.category, 40),
             cookingTime, difficulty, ingredients, instructions, tags };
}
async function writeRecipeParts(id, v, tx) {
    await q("DELETE FROM dbo.recipe_ingredients WHERE recipe_id = @id", { id }, tx);
    await q("DELETE FROM dbo.recipe_steps WHERE recipe_id = @id", { id }, tx);
    await q("DELETE FROM dbo.recipe_tags WHERE recipe_id = @id", { id }, tx);
    for (const i of v.ingredients)
        await q("INSERT dbo.recipe_ingredients (recipe_id,name,importance,weight) VALUES (@id,@n,@imp,@w)",
                { id, n: i.name, imp: i.importance, w: WEIGHTS[i.importance] }, tx);
    for (let n = 0; n < v.instructions.length; n++)
        await q("INSERT dbo.recipe_steps (recipe_id,step_number,instruction) VALUES (@id,@n,@s)", { id, n: n + 1, s: v.instructions[n] }, tx);
    for (const t of v.tags) await q("INSERT dbo.recipe_tags (recipe_id,tag) VALUES (@id,@t)", { id, t }, tx);
}

/* ---------- sessions ---------- */
async function startSession(res, user, status) {
    const token = crypto.randomBytes(32).toString("hex");
    await q("DELETE FROM dbo.sessions WHERE expires_at < SYSUTCDATETIME()");
    await q("INSERT dbo.sessions (token,user_id,expires_at) VALUES (@t,@u,DATEADD(DAY,@d,SYSUTCDATETIME()))",
            { t: token, u: user.id, d: SESSION_DAYS });
    send(res, status, { user: publicUser(user, true) },
        { "Set-Cookie": `sangkap_session=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax` });
}

/* ---------- API routes ---------- */
async function api(req, res, url) {
    const m = req.method, p = url.pathname;
    let g;

    // Everything the pages need on load, in one call.
    if (m === "GET" && p === "/api/sync") {
        const me = await currentUser(req);
        const users = (await q("SELECT * FROM dbo.users ORDER BY id")).map(u => publicUser(u, me && me.id === u.id));
        const ratings = (await q("SELECT user_id, recipe_id, rating, created_at FROM dbo.ratings")).map(r => ({
            id: ratingKey(r.user_id, r.recipe_id), userId: userKey(r.user_id), recipeId: recipeKey(r.recipe_id),
            rating: r.rating, dateCreated: iso(r.created_at) }));
        let favorites = [], basket = null;
        if (me) {
            favorites = (await q("SELECT recipe_id, saved_at FROM dbo.favorites WHERE user_id = @u", { u: me.id }))
                .map(f => ({ userId: userKey(me.id), recipeId: recipeKey(f.recipe_id), dateSaved: iso(f.saved_at) }));
            basket = (await q("SELECT ingredient FROM dbo.basket_items WHERE user_id = @u", { u: me.id })).map(i => i.ingredient);
        }
        return send(res, 200, { me: me ? publicUser(me, true) : null, users, recipes: await loadRecipes(), ratings, favorites, basket });
    }

    // Picture upload: the browser sends a shrunken picture, the server saves it as a file
    // and returns its path, which is then stored in the database with the recipe or profile.
    if (m === "POST" && p === "/api/upload") {
        if (!allowUpload(req.socket.remoteAddress)) fail(429, "Too many uploads. Try again in an hour.");
        const b = await readBody(req, 3e6);
        try { return send(res, 201, { path: saveImage(b.data) }); }
        catch (e) { if (e.userMessage) fail(400, e.userMessage); throw e; }
    }

    if (m === "POST" && p === "/api/register") {
        const b = await readBody(req);
        const username = str(b.username, 30), email = str(b.email, 120), password = String(b.password || "");
        if (username.length < 3) fail(400, "The username must be at least 3 characters long.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(400, "Enter a valid email address.");
        if (password.length < 6) fail(400, "The password must contain at least 6 characters.");
        if ((await q("SELECT 1 AS x FROM dbo.users WHERE username = @v", { v: username })).length) fail(409, "This username is already in use.");
        if ((await q("SELECT 1 AS x FROM dbo.users WHERE email = @v", { v: email })).length) fail(409, "This email is already registered.");
        const rows = await q(`INSERT dbo.users (username,email,password_hash,display_name,profile_image)
                              OUTPUT INSERTED.* VALUES (@u,@e,@h,@d,@i)`,
            { u: username, e: email, h: hashPassword(password), d: str(b.displayName, 60) || username, i: str(b.profileImage, 500) });
        return startSession(res, rows[0], 201);
    }
    if (m === "POST" && p === "/api/login") {
        const b = await readBody(req);
        const id = str(b.identifier, 120);
        const user = (await q("SELECT * FROM dbo.users WHERE username = @v OR email = @v", { v: id }))[0];
        // Same message for "no such user" and "wrong password" so accounts can't be probed.
        if (!user || !verifyPassword(String(b.password || ""), user.password_hash)) fail(401, "Incorrect username/email or password.");
        return startSession(res, user, 200);
    }
    if (m === "POST" && p === "/api/logout") {
        const token = getCookie(req, "sangkap_session");
        if (token && /^[0-9a-f]{64}$/.test(token)) await q("DELETE FROM dbo.sessions WHERE token = @t", { t: token });
        return send(res, 200, { ok: true }, { "Set-Cookie": "sangkap_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });
    }
    if (m === "PUT" && p === "/api/me") {
        const user = await requireUser(req);
        const b = await readBody(req);
        const displayName = str(b.displayName, 60);
        if (displayName.length < 2) fail(400, "Your display name needs at least 2 characters.");
        await transaction(async tx => {
            await q("UPDATE dbo.users SET display_name = @d, profile_image = @i WHERE id = @u",
                    { d: displayName, i: str(b.profileImage, 500), u: user.id }, tx);
            await q("UPDATE dbo.recipes SET author_name = @d WHERE author_id = @u", { d: displayName, u: user.id }, tx);
        });
        const fresh = (await q("SELECT * FROM dbo.users WHERE id = @u", { u: user.id }))[0];
        return send(res, 200, { user: publicUser(fresh, true) });
    }

    if (m === "POST" && p === "/api/recipes") {
        const user = await requireUser(req);
        const v = validateRecipe(await readBody(req));
        const id = await transaction(async tx => {
            const rows = await q(`INSERT dbo.recipes (title,description,image,category,cooking_time,difficulty,author_id,author_name,is_community)
                                  OUTPUT INSERTED.id VALUES (@t,@d,@i,@c,@ct,@df,@a,@an,1)`,
                { t: v.title, d: v.description, i: v.image, c: v.category, ct: v.cookingTime, df: v.difficulty, a: user.id, an: user.display_name }, tx);
            await writeRecipeParts(rows[0].id, v, tx);
            return rows[0].id;
        });
        return send(res, 201, { recipe: (await loadRecipes(id))[0] });
    }
    if ((g = p.match(/^\/api\/recipes\/(REC\d+)$/))) {
        const id = parseKey("REC", g[1]);
        const row = (await q("SELECT author_id FROM dbo.recipes WHERE id = @id", { id }))[0];
        if (!row) fail(404, "Recipe not found.");
        if (m === "GET") return send(res, 200, { recipe: (await loadRecipes(id))[0] });
        const user = await requireUser(req);
        if (row.author_id !== user.id && user.role !== "admin") fail(403, "You can only change your own recipes.");
        if (m === "PUT") {
            const v = validateRecipe(await readBody(req));
            await transaction(async tx => {
                await q(`UPDATE dbo.recipes SET title=@t, description=@d, image=@i, category=@c, cooking_time=@ct, difficulty=@df WHERE id=@id`,
                    { t: v.title, d: v.description, i: v.image, c: v.category, ct: v.cookingTime, df: v.difficulty, id }, tx);
                await writeRecipeParts(id, v, tx);
            });
            return send(res, 200, { recipe: (await loadRecipes(id))[0] });
        }
        if (m === "DELETE") { await q("DELETE FROM dbo.recipes WHERE id = @id", { id }); return send(res, 200, { ok: true }); }
    }
    if ((g = p.match(/^\/api\/recipes\/(REC\d+)\/rate$/)) && m === "POST") {
        const user = await requireUser(req), id = parseKey("REC", g[1]);
        const rating = parseInt((await readBody(req)).rating, 10);
        if (!(rating >= 1 && rating <= 5)) fail(400, "Rating must be 1 to 5.");
        if (!(await q("SELECT 1 AS x FROM dbo.recipes WHERE id = @id", { id })).length) fail(404, "Recipe not found.");
        await q(`UPDATE dbo.ratings SET rating = @r, created_at = SYSUTCDATETIME() WHERE user_id = @u AND recipe_id = @id;
                 IF @@ROWCOUNT = 0 INSERT dbo.ratings (user_id,recipe_id,rating) VALUES (@u,@id,@r);`,
                { r: rating, u: user.id, id });
        return send(res, 200, { ok: true });
    }

    if ((g = p.match(/^\/api\/favorites\/(REC\d+)$/))) {
        const user = await requireUser(req), id = parseKey("REC", g[1]);
        if (m === "PUT") {
            if (!(await q("SELECT 1 AS x FROM dbo.recipes WHERE id = @id", { id })).length) fail(404, "Recipe not found.");
            await q(`IF NOT EXISTS (SELECT 1 FROM dbo.favorites WHERE user_id = @u AND recipe_id = @id)
                         INSERT dbo.favorites (user_id,recipe_id) VALUES (@u,@id)`, { u: user.id, id });
            return send(res, 200, { ok: true });
        }
        if (m === "DELETE") { await q("DELETE FROM dbo.favorites WHERE user_id = @u AND recipe_id = @id", { u: user.id, id }); return send(res, 200, { ok: true }); }
    }
    if (m === "PUT" && p === "/api/basket") {
        const user = await requireUser(req);
        const b = await readBody(req);
        const list = [...new Set((Array.isArray(b.ingredients) ? b.ingredients : []).map(i => str(i, 80).toLowerCase()).filter(Boolean))].slice(0, 200);
        await transaction(async tx => {
            await q("DELETE FROM dbo.basket_items WHERE user_id = @u", { u: user.id }, tx);
            for (const i of list) await q("INSERT dbo.basket_items (user_id,ingredient) VALUES (@u,@i)", { u: user.id, i }, tx);
        });
        return send(res, 200, { ingredients: list });
    }
    fail(404, "Not found.");
}

/* ---------- static files (the website itself) ---------- */
function serveStatic(req, res, url) {
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { rel = "/"; }
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(ROOT, rel));
    const relative = path.relative(ROOT, file);
    const top = relative.split(path.sep)[0];
    // Only the website's own folders and pages are public. Never backend/, .env, .git, node_modules.
    const allowed = /\.html$/.test(relative) && !relative.includes(path.sep) || ["css", "js", "assets"].includes(top);
    if (relative.startsWith("..") || !allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(file).pipe(res);
}

async function main() {
    await connect();
    console.log("Connected to SQL Server.");
    const port = process.env.PORT || 3000;
    http.createServer(async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        try {
            if (url.pathname.startsWith("/api/")) await api(req, res, url);
            else serveStatic(req, res, url);
        } catch (e) {
            if (e instanceof HttpError) return send(res, e.status, { error: e.message });
            console.error(e);
            send(res, 500, { error: "Something went wrong on the server." });
        }
    }).listen(port, () => console.log("S.A.N.G.K.A.P. running at http://localhost:" + port));
}
main().catch(e => { console.error("\nCould not start: " + e.message + "\n"); process.exit(1); });
