// FILE PATH: examples/basic.js   
//npm link maazdb-js
const MaazDB = require('maazdb-js');

async function main() {
    console.log("--- MaazDB Node.js Client ---");

    const db = new MaazDB();

    try {
        // 1. Connect
        console.log("Connecting...");
        await db.connect("127.0.0.1", 8888, "admin", "admin");
        console.log("✓ Connected via TLS 1.3");

        // 2. Run Queries
        const queries = [
            "CREATE DATABASE node_test;",
            "USE node_test;",
            "CREATE TABLE js_users (id SERIAL PRIMARY KEY, name TEXT);",
            "INSERT INTO js_users (name) VALUES ('Maaz');",
            "INSERT INTO js_users (name) VALUES ('Waheed');",
            "SELECT * FROM js_users;"
        ];

        for (const sql of queries) {
            console.log(`\nExecuting: ${sql}`);
            const result = await db.query(sql);
            console.log(`Server: ${result.trim()}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        db.close();
        console.log("\nConnection closed.");
    }
}

main();