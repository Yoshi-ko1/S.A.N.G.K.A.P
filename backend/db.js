// Connection to SQL Server (SQLEXPRESS) using the "mssql" package.
const path = require("node:path");
const sql = require("mssql");

// Reads settings from the .env file in the project folder (Node 20.12+).
try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch { /* no .env file, use real environment variables */ }

const config = {
    server: process.env.DB_SERVER || "localhost",
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || "SangkapDB",
    user: process.env.DB_USER || "sangkap_app",
    password: process.env.DB_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },   // fine for a local machine
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool;
async function connect() {
    if (!config.password) throw new Error("DB_PASSWORD is missing. Copy .env.example to .env and set it.");
    pool = await new sql.ConnectionPool(config).connect();
    return pool;
}

// q("SELECT ... WHERE id = @id", { id: 5 })  ->  array of rows.
// Values always go in as parameters (never glued into the text), which blocks SQL injection.
async function q(text, params = {}, tx = null) {
    const req = tx ? new sql.Request(tx) : pool.request();
    for (const [name, v] of Object.entries(params)) {
        if (typeof v === "number") req.input(name, sql.Int, v);
        else req.input(name, sql.NVarChar(sql.MAX), v == null ? null : String(v));
    }
    const result = await req.query(text);
    return result.recordset || [];
}

// transaction(async tx => { await q("...", {}, tx); ... })  - all or nothing.
async function transaction(fn) {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try { const r = await fn(tx); await tx.commit(); return r; }
    catch (e) { try { await tx.rollback(); } catch { /* already rolled back */ } throw e; }
}

module.exports = { connect, q, transaction, config };
