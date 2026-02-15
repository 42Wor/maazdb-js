
# MaazDB-JS 🟩

**The Official Node.js Driver for MaazDB**

![Node](https://img.shields.io/badge/node-%3E%3D14.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

`maazdb-js` is a high-performance, asynchronous Node.js client for MaazDB. It uses native Promises and Buffers to handle the binary protocol securely over TLS.

## 📦 Installation

```bash
npm install maazdb-js
```

## 🛠 Usage

```javascript
const MaazDB = require('maazdb-js');

async function run() {
    const db = new MaazDB();

    try {
        // Connect securely
        await db.connect("127.0.0.1", 8888, "admin", "password");
        
        // Run SQL
        await db.query("CREATE DATABASE web_app;");
        await db.query("USE web_app;");
        
        const users = await db.query("SELECT * FROM users;");
        console.log(users);

    } catch (e) {
        console.error(e);
    } finally {
        db.close();
    }
}

run();
```

## 🧪 Testing

1. Start your Rust Server.
2. Run the example:

```bash
node examples/basic.js
```
---



Created for the MaazDB Ecosystem.
