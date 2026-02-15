class MaazDBError extends Error {
    constructor(message) {
        super(message);
        this.name = "MaazDBError";
    }
}

class AuthError extends MaazDBError {
    constructor(message) {
        super(message);
        this.name = "AuthError";
    }
}

class ProtocolError extends MaazDBError {
    constructor(message) {
        super(message);
        this.name = "ProtocolError";
    }
}

module.exports = { MaazDBError, AuthError, ProtocolError };