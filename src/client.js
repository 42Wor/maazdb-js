const tls = require('tls');
const { 
    PACKET_HANDSHAKE, PACKET_AUTH_OK, PACKET_AUTH_ERR, 
    PACKET_QUERY, PACKET_MSG, PACKET_DATA, DRIVER_SIG 
} = require('./protocol');
const { AuthError, ProtocolError, MaazDBError } = require('./errors');

class MaazDB {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.buffer = Buffer.alloc(0); // Store incoming data chunks
        this.currentResolve = null;    // Promise resolver for the current query
        this.currentReject = null;     // Promise rejector for the current query
    }

    /**
     * Connects to the MaazDB server securely via TLS.
     */
    connect(host, port, user, password) {
        return new Promise((resolve, reject) => {
            const options = {
                host: host,
                port: port,
                rejectUnauthorized: false, // Allow self-signed certs (Dev Mode)
            };

            this.socket = tls.connect(options, () => {
                // 1. Send Handshake immediately upon connection
                const payload = `${user}\0${password}\0${DRIVER_SIG}`;
                this._sendPacket(PACKET_HANDSHAKE, payload);
            });

            this.socket.on('data', (data) => {
                this._handleData(data);
            });

            this.socket.on('error', (err) => {
                this.connected = false;
                if (this.currentReject) this.currentReject(err);
                else reject(err);
            });

            this.socket.on('close', () => {
                this.connected = false;
            });

            // We hijack the first request to handle Auth
            this.currentResolve = () => {
                this.connected = true;
                resolve(this);
            };
            this.currentReject = (err) => {
                this.close();
                reject(err);
            };
        });
    }

    /**
     * Sends a SQL query and returns the result string.
     */
    query(sql) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new MaazDBError("Not connected to server"));
            }

            // Set the callbacks for when data arrives
            this.currentResolve = resolve;
            this.currentReject = reject;

            this._sendPacket(PACKET_QUERY, sql);
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

    _sendPacket(type, payloadStr) {
        const payload = Buffer.from(payloadStr, 'utf8');
        const length = payload.length;

        // Header: [Type (1B)] [Length (4B Big Endian)]
        const header = Buffer.alloc(5);
        header.writeUInt8(type, 0);
        header.writeUInt32BE(length, 1);

        const packet = Buffer.concat([header, payload]);
        this.socket.write(packet);
    }

    _handleData(chunk) {
        // Append new chunk to our buffer
        this.buffer = Buffer.concat([this.buffer, chunk]);

        // Try to parse packets from the buffer
        while (true) {
            if (this.buffer.length < 5) return; // Wait for more data

            // Read Header
            const type = this.buffer.readUInt8(0);
            const length = this.buffer.readUInt32BE(1);

            // Check if we have the full payload
            if (this.buffer.length < 5 + length) return; // Wait for more data

            // Extract Payload
            const payloadBuffer = this.buffer.subarray(5, 5 + length);
            const payloadStr = payloadBuffer.toString('utf8');

            // Remove this packet from the buffer
            this.buffer = this.buffer.subarray(5 + length);

            // Handle the packet
            this._processPacket(type, payloadStr);
        }
    }

    _processPacket(type, msg) {
        if (type === PACKET_AUTH_OK) {
            if (this.currentResolve) this.currentResolve("Authenticated");
        } 
        else if (type === PACKET_AUTH_ERR) {
            if (this.currentReject) this.currentReject(new AuthError(msg));
        } 
        else if (type === PACKET_MSG || type === PACKET_DATA) {
            if (this.currentResolve) this.currentResolve(msg);
        } 
        else {
            if (this.currentReject) this.currentReject(new ProtocolError(`Unknown Packet: ${type}`));
        }

        // Reset callbacks
        this.currentResolve = null;
        this.currentReject = null;
    }
}

module.exports = MaazDB;