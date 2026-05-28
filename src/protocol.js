// Protocol Constants
const PACKET_HANDSHAKE = 0x10;
const PACKET_AUTH_OK   = 0x11;
const PACKET_AUTH_ERR  = 0x12;
const PACKET_QUERY     = 0x20;
const PACKET_MSG       = 0x02;
const PACKET_DATA      = 0x03;

// Driver Signature
const DRIVER_SIG = "maazdb-nodejs-driver-v1";

module.exports = {
    PACKET_HANDSHAKE,
    PACKET_AUTH_OK,
    PACKET_AUTH_ERR,
    PACKET_QUERY,
    PACKET_MSG,
    PACKET_DATA,
    DRIVER_SIG
};