# MaazDB-JS 

**The Official Node.js Driver for MaazDB**

[🌐 Official Website](https://maazdb.vercel.app/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node](https://img.shields.io/badge/node-%3E%3D14.0-green)
![Security](https://img.shields.io/badge/security-TLS_1.3-green)

`maazdb-js` is a high-performance, asynchronous Node.js client library for interacting with the MaazDB engine. It implements the custom, multiplexed MaazDB Binary Protocol v2.1 securely over a TLS 1.3 connection with native Promise interfaces.

## 📦 Installation

You can install the driver via npm:

```bash
npm install maazdb-js
```

Or using yarn:

```bash
yarn add maazdb-js
```

## ✨ Features
* **Asynchronous Multiplexing:** Execute multiple queries concurrently over a single TCP pipeline, eliminating head-of-line blocking and reducing response overhead.
* **Cryptographic Handshake:** Employs modern HMAC-SHA256 challenge-response verification, preventing transmission of plain credentials.
* **Latency Optimized:** Automatically disables Nagle's algorithm natively (`TCP_NODELAY`) to eliminate network round-trip packet buffering delays.
* **0-RTT Safe Flight Auto-Opt-In:** The client automatically tags read-only queries (`SELECT`, `SHOW`, `DESCRIBE`) with the `FLAG_EARLY_DATA` protocol header to execute securely during the initial flight.
* **Secure by Default:** Wrapped securely over a TLS 1.3 socket layer.

## 🛠 Usage

### Basic Connection

The driver is designed to work with modern `async/await` syntax for clean, non-blocking database operations.

```javascript
const MaazDB = require('maazdb-js');

async function main() {
    // 1. Initialize the client
    const db = new MaazDB();

    try {
        // 2. Connect securely (Handshake, HMAC signatures, and TCP_NODELAY are handled automatically)
        await db.connect("127.0.0.1", 8888, "admin", "admin");
        console.log("✓ Connected securely to MaazDB");

        // 3. Run SQL commands
        await db.query("CREATE DATABASE web_app;");
        await db.query("USE web_app;");
        
        // 4. Insert Data
        await db.query("CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT);");
        
        // We can now execute inserts concurrently over the same shared connection!
        await Promise.all([
            db.query("INSERT INTO users (username) VALUES ('maaz_dev');"),
            db.query("INSERT INTO users (username) VALUES ('node_dev');")
        ]);

        // 5. Fetch Results
        const results = await db.query("SELECT * FROM users;");
        console.log("Results:\n", results);

    } catch (error) {
        console.error("Database Error:", error.message);
    } finally {
        // 6. Close connection
        db.close();
    }
}

main();
```

---

## 🧪 Development

To run the included example script and verify your setup:

1. Ensure your **MaazDB Server** is running on port 8888.
2. Run the example:

```bash
node examples/basic.js
```

## 📄 License

Distributed under the MIT License.

---
*Created for the MaazDB Ecosystem.*
```