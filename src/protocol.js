// FILE PATH: src/protocol.js

// Protocol Constants
const PACKET_CHALLENGE_REQ  = 0x10;
const PACKET_CHALLENGE_RESP = 0x11;
const PACKET_AUTH_OK        = 0x12;
const PACKET_AUTH_ERR       = 0x13;
const PACKET_QUERY          = 0x20;
const PACKET_MSG            = 0x02;
const PACKET_DATA           = 0x03;

// Protocol Flags
const FLAG_NONE       = 0x00;
const FLAG_EARLY_DATA = 0x02; // 0-RTT Safe Flight

// Standalone Driver Signature
const DRIVER_SIG = "maazdb-nodejs-driver-v1";

module.exports = {
    PACKET_CHALLENGE_REQ,
    PACKET_CHALLENGE_RESP,
    PACKET_AUTH_OK,
    PACKET_AUTH_ERR,
    PACKET_QUERY,
    PACKET_MSG,
    PACKET_DATA,
    FLAG_NONE,
    FLAG_EARLY_DATA,
    DRIVER_SIG
};