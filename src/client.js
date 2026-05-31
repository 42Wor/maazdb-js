// FILE PATH: src/client.js

const tls = require('tls');
const crypto = require('crypto');
const { 
    PACKET_CHALLENGE_REQ, PACKET_CHALLENGE_RESP, PACKET_AUTH_OK, PACKET_AUTH_ERR, 
    PACKET_QUERY, PACKET_MSG, PACKET_DATA, FLAG_NONE, FLAG_EARLY_DATA, DRIVER_SIG 
} = require('./protocol');
const { AuthError, ProtocolError, MaazDBError } = require('./errors');

class MaazDB {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.buffer = Buffer.alloc(0);         // Store incoming data chunks
        this.pendingRequests = new Map();      // Map: reqId -> { resolve, reject }
        this.nextReqId = 1;                    // Auto-incrementing request ID counter
        this.authResolve = null;               // Handshake resolver callback
        this.authReject = null;                // Handshake rejector callback
    }

    /**
     * Connects to the MaazDB server securely via TLS.
     */
    connect(host, port, user, password) {
        return new Promise((resolve, reject) => {
            const options = {
                host: host,
                port: port,
                rejectUnauthorized: false,     // Allow self-signed certs (Dev Mode)
            };

            this.authResolve = resolve;
            this.authReject = reject;

            this.socket = tls.connect(options, () => {
                // Feature: Disable Nagle's algorithm to eliminate network round-trip buffering delays [1]
                this.socket.setNoDelay(true);
            });

            this.socket.on('data', (data) => {
                this._handleData(data, user, password);
            });

            this.socket.on('error', (err) => {
                this.connected = false;
                if (this.authReject) {
                    this.authReject(err);
                    this.authReject = null;
                    this.authResolve = null;
                } else {
                    // Propagate network errors to all active query futures
                    for (const [_, req] of this.pendingRequests) {
                        req.reject(err);
                    }
                    this.pendingRequests.clear();
                }
            });

            this.socket.on('close', () => {
                this.connected = false;
            });
        });
    }

    /**
     * Sends a SQL query asynchronously and returns the result string.
     * Safe to call concurrently over the same shared TLS socket.
     */
    query(sql) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new MaazDBError("Not connected to server"));
            }

            const reqId = this.nextReqId;
            this.nextReqId = (this.nextReqId + 1) % 65536 || 1; // Wrap 1-65535

            // Feature: Auto-tag read-only commands for 0-RTT Safe Flight processing
            let flags = FLAG_NONE;
            const upperSql = sql.trim().toUpperCase();
            if (
                upperSql.startsWith("SELECT") || 
                upperSql.startsWith("SHOW") || 
                upperSql.startsWith("DESCRIBE") || 
                upperSql.startsWith("DESC")
            ) {
                flags |= FLAG_EARLY_DATA;
            }

            // Register asynchronous callbacks mapping to Request ID
            this.pendingRequests.set(reqId, { resolve, reject });

            this._sendPacket(PACKET_QUERY, flags, reqId, sql);
        });
    }

    close() {
        if (this.socket) {
            this.socket.end();
            this.socket.destroy();
        }
        this.connected = false;
    }

    // --- Internal Helpers ---

    _sendPacket(type, flags, reqId, payloadStr) {
        const payload = Buffer.from(payloadStr, 'utf8');
        const length = payload.length;

        // Header: [Type (1B)] [Flags (1B)] [ReqID (2B Big Endian)] [Length (4B Big Endian)]
        const header = Buffer.alloc(8);
        header.writeUInt8(type, 0);
        header.writeUInt8(flags, 1);
        header.writeUInt16BE(reqId, 2);
        header.writeUInt32BE(length, 4);

        const packet = Buffer.concat([header, payload]);
        if (this.socket) {
            this.socket.write(packet);
        }
    }

    _handleData(chunk, user, password) {
        this.buffer = Buffer.concat([this.buffer, chunk]);

        // Parse incoming packets out of the cumulative read buffer
        while (true) {
            if (this.buffer.length < 8) return; // Wait for 8-byte framing header

            const type = this.buffer.readUInt8(0);
            const flags = this.buffer.readUInt8(1);
            const reqId = this.buffer.readUInt16BE(2);
            const length = this.buffer.readUInt32BE(4);

            if (this.buffer.length < 8 + length) return; // Wait for complete payload chunk

            const payloadBuffer = this.buffer.subarray(8, 8 + length);

            // Splice processed packet from the buffer
            this.buffer = this.buffer.subarray(8 + length);

            this._processPacket(type, flags, reqId, payloadBuffer, user, password);
        }
    }

    _processPacket(type, flags, reqId, payload, user, password) {
        if (type === PACKET_CHALLENGE_REQ) {
            // Feature: Compute cryptographic HMAC-SHA256 signature
            const hmac = crypto.createHmac('sha256', password);
            hmac.update(payload);
            const signatureHex = hmac.digest('hex');

            // Format: Username \0 Password \0 DriverID \0 SignatureHex
            const responsePayload = `${user}\0${password}\0${DRIVER_SIG}\0${signatureHex}`;
            this._sendPacket(PACKET_CHALLENGE_RESP, FLAG_NONE, 0, responsePayload);
        } 
        else if (type === PACKET_AUTH_OK) {
            this.connected = true;
            if (this.authResolve) {
                this.authResolve(this);
                this.authResolve = null;
                this.authReject = null;
            }
        } 
        else if (type === PACKET_AUTH_ERR) {
            const msg = payload.toString('utf8');
            const err = new AuthError(msg);
            
            if (this.authReject) {
                this.authReject(err);
                this.authResolve = null;
                this.authReject = null;
                this.close();
            } else {
                // Propagate specific auth errors to matching requests
                const req = this.pendingRequests.get(reqId);
                if (req) {
                    req.reject(err);
                    this.pendingRequests.delete(reqId);
                }
            }
        } 
        else if (type === PACKET_MSG || type === PACKET_DATA) {
            const msg = payload.toString('utf8');
            const req = this.pendingRequests.get(reqId);
            if (req) {
                req.resolve(msg);
                this.pendingRequests.delete(reqId);
            }
        } 
        else {
            const err = new ProtocolError(`Unknown Packet type received: ${type}`);
            const req = this.pendingRequests.get(reqId);
            if (req) {
                req.reject(err);
                this.pendingRequests.delete(reqId);
            }
        }
    }
}

module.exports = MaazDB;