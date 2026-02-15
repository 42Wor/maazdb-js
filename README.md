# MaazDB-JS 

**The Official Node.js Driver for MaazDB**

[🌐 Official Website](https://maazdb.vercel.app/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node](https://img.shields.io/badge/node-%3E%3D14.0-green)
![Security](https://img.shields.io/badge/security-TLS_1.3-green)

`maazdb-js` is a high-performance, asynchronous Node.js client library for interacting with the MaazDB engine. It leverages native Promises and Node.js Buffers to implement the custom MaazDB binary protocol securely over TLS 1.3.

## 📦 Installation

You can install the driver via npm:

```bash
npm install maazdb-js
```

Or using yarn:

```bash
yarn add maazdb-js
```

## 🛠 Usage

### Basic Connection

The driver is designed to work with modern `async/await` syntax for clean, non-blocking database operations.

```javascript
const MaazDB = require('maazdb-js');

async function main() {
    // 1. Initialize the client
    const db = new MaazDB();

    try {
        // 2. Connect securely (TLS is handled automatically)
        await db.connect("127.0.0.1", 8888, "admin", "admin");
        console.log("✓ Connected to MaazDB");

        // 3. Run SQL commands
        await db.query("CREATE DATABASE web_app;");
        await db.query("USE web_app;");
        
        // 4. Insert Data
        await db.query("CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT);");
        await db.query("INSERT INTO users (username) VALUES ('maaz_dev');");

        // 5. Fetch Results
        const results = await db.query("SELECT * FROM users;");
        console.log("Results:", results);

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

## 📋 Protocol Specifications

The driver communicates using the **MaazDB Binary Protocol v1**:

1.  **Handshake:** `[Type: 0x10] [Len: 4B] [User\0Pass\0Sig]`
2.  **Query:** `[Type: 0x20] [Len: 4B] [SQL String]`
3.  **Response:** `[Type: 0x02/0x03] [Len: 4B] [Result String]`

All integers are handled as **Big Endian** using Node.js `Buffer.writeUInt32BE()` and `Buffer.readUInt32BE()`.

## 🧪 Development

To run the included example script and verify your setup:

1.  Ensure your **MaazDB Server** is running on port 8888.
2.  Run the example:

```bash
node examples/basic.js
```

## 📄 License

Distributed under the MIT License.

---
*Created for the MaazDB Ecosystem.*
