const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MaazDB = require('maazdb-js');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'maazdb-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Helper to get DB connection
async function getDB(req) {
    if (!req.session.dbConfig) return null;
    const db = new MaazDB();
    const { host, port, user, password } = req.session.dbConfig;
    try {
        await db.connect(host, parseInt(port), user, password);
        return db;
    } catch (e) {
        return null;
    }
}

// Helper to parse MaazDB Professional Output
function parseResult(raw) {
    try {
        const parsed = JSON.parse(raw);
        return parsed; // Returns { type: "table", headers: [], data: [[]] }
    } catch (e) {
        return { type: "message", content: raw };
    }
}

// --- ROUTES ---

app.get('/', (req, res) => res.render('login', { error: null }));

app.post('/connect', async (req, res) => {
    const { host, port, user, password } = req.body;
    const db = new MaazDB();
    try {
        await db.connect(host, parseInt(port), user, password);
        req.session.dbConfig = { host, port, user, password };
        db.close();
        res.redirect('/databases');
    } catch (e) {
        res.render('login', { error: "Connection Failed: " + e.message });
    }
});

app.get('/databases', async (req, res) => {
    const db = await getDB(req);
    if (!db) return res.redirect('/');
    try {
        const raw = await db.query("SHOW DATABASES;");
        const result = parseResult(raw);
        res.render('databases', { result });
    } catch (e) {
        res.send("Error: " + e.message);
    } finally { db.close(); }
});

app.get('/db/:dbname', async (req, res) => {
    const db = await getDB(req);
    if (!db) return res.redirect('/');
    try {
        await db.query(`USE ${req.params.dbname};`);
        const raw = await db.query("SHOW TABLES;");
        const result = parseResult(raw);
        res.render('tables', { dbname: req.params.dbname, result });
    } catch (e) {
        res.send("Error: " + e.message);
    } finally { db.close(); }
});

app.get('/db/:dbname/table/:tablename', async (req, res) => {
    const db = await getDB(req);
    if (!db) return res.redirect('/');
    const { dbname, tablename } = req.params;
    try {
        await db.query(`USE ${dbname};`);
        const structRaw = await db.query(`DESCRIBE ${tablename};`);
        const dataRaw = await db.query(`SELECT * FROM ${tablename};`);
        
        res.render('view_table', { 
            dbname, tablename, 
            structure: parseResult(structRaw), 
            data: parseResult(dataRaw),
            queryError: req.query.error || null
        });
    } catch (e) {
        res.send("Error: " + e.message);
    } finally { db.close(); }
});

app.post('/query', async (req, res) => {
    const db = await getDB(req);
    if (!db) return res.redirect('/');
    const { dbname, tablename, sql } = req.body;
    try {
        await db.query(`USE ${dbname};`);
        const resRaw = await db.query(sql);
        if (resRaw.includes("Error:")) {
            res.redirect(`/db/${dbname}/table/${tablename}?error=${encodeURIComponent(resRaw)}`);
        } else {
            res.redirect(`/db/${dbname}/table/${tablename}`);
        }
    } catch (e) {
        res.redirect(`/db/${dbname}/table/${tablename}?error=${encodeURIComponent(e.message)}`);
    } finally { db.close(); }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`MaazDB Admin: http://localhost:${PORT}`));