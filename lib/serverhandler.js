"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const crypto_1 = __importDefault(require("crypto"));
class ServerHandler {
    constructor(address, port = 8303, ignoreToken = true) {
        this.port = 8303;
        this.address = address;
        this.port = port;
        this.ignoreToken = ignoreToken;
    }
    requestInfo() {
        return new Promise((resolve, reject) => {
            const socket = dgram_1.default.createSocket("udp4");
            socket.on("error", err => {
                reject(err);
            });
            let token;
            let extraToken;
            socket.on("listening", async () => {
                const res = await this.sendRequest(socket);
                token = res.token;
                extraToken = res.extraToken;
            });
            socket.on("message", (msg, rinfo) => {
                if (rinfo.address === this.address && rinfo.port === this.port) {
                    socket.close();
                    const serverInfo = this.parsePacket(msg, token, extraToken);
                    resolve(serverInfo);
                }
            });
            socket.bind();
        });
    }
    sendRequest(socket) {
        return new Promise((resolve, reject) => {
            const buffer = Buffer.alloc(15);
            buffer.write("xe", 0, 2);
            crypto_1.default.randomFillSync(buffer, 2, 2);
            buffer.fill(0xff, 6, 10);
            buffer.write("gie3", 10, 4);
            crypto_1.default.randomFillSync(buffer, 14, 1);
            const extraToken = buffer.readIntBE(2, 2);
            const token = buffer.readIntBE(14, 1);
            socket.send(buffer, this.port, this.address, (err, bytes) => {
                if (err)
                    reject(err);
                resolve({ token, extraToken, bytes });
            });
        });
    }
    parsePacket(buffer, sentToken, sentExtraToken) {
        let type = buffer.subarray(10, 14).toString();
        let initClients = false;
        let stype = "";
        if (type === "inf3") {
            type = "vanilla";
            initClients = true;
        }
        else if (type === "dtsf") {
            type = "64legacy";
        }
        else if (type === "iext") {
            type = "ext";
            initClients = true;
        }
        else if (type === "iex+") {
            type = "extmore";
            stype = "ext";
        }
        if (type !== "ext") {
            stype = type;
        }
        const slots = String(buffer.subarray(14, buffer.length)).split("\x00");
        // debug(slots)
        const token = parseInt(slots.shift(), 10);
        if ((token & 0xff) !== sentToken) {
            if (!this.ignoreToken) {
                throw new Error("Server sent an invalid token.");
            }
        }
        if (stype === "ext") {
            if ((token & 0xffff00) >> 8 !== sentExtraToken) {
                if (!this.ignoreToken) {
                    throw new Error("Server sent an invalid extraToken.");
                }
            }
        }
        const serverInfo = {
            version: "",
            clientCount: 0,
            gameType: "",
            map: "",
            maxClientCount: 0,
            maxPlayerCount: 0,
            name: "",
            password: false,
            playerCount: 0,
            clients: [],
        };
        if (type !== "extmore") {
            serverInfo.version = slots.shift();
            serverInfo.name = slots.shift();
            serverInfo.map = slots.shift();
            if (type === "ext") {
                serverInfo.mapcrc = parseInt(slots.shift(), 10);
                serverInfo.mapsize = parseInt(slots.shift(), 10);
            }
            serverInfo.gameType = slots.shift();
            serverInfo.password = parseInt(slots.shift(), 10) === 1;
            serverInfo.playerCount = parseInt(slots.shift(), 10);
            serverInfo.maxPlayerCount = parseInt(slots.shift(), 10);
            serverInfo.clientCount = parseInt(slots.shift(), 10);
            serverInfo.maxClientCount = parseInt(slots.shift(), 10);
        }
        let clientnum = 0;
        if (type === "64legacy") {
            clientnum = this.unPackInt(slots);
            if (clientnum < 0 || clientnum >= 64) {
                return null;
            }
        }
        let packetnum = 0;
        if (type === "extmore") {
            packetnum = parseInt(slots.shift(), 10);
            // 0 is reserved for the main ext packet
            if (packetnum <= 0 || packetnum >= 64) {
                return null;
            }
        }
        let reserved;
        const clientPackets = [];
        let clientNumbers = [];
        if (type === "ext") {
            reserved = slots.shift();
            if (!(packetnum in clientPackets))
                clientPackets.push(packetnum);
            else
                return null;
        }
        while (true) {
            if (slots.length === 0)
                break;
            if (type === "vanilla" && serverInfo.clientCount === 16)
                break;
            if (serverInfo.clientCount === 64)
                break;
            let addClient = true;
            if (type === "64legacy") {
                if (!clientNumbers) {
                    clientNumbers = [];
                }
                if (!(clientnum in clientNumbers))
                    clientNumbers.push(clientnum);
                else
                    addClient = false;
            }
            // Check if slots is enough big so that it contains another player
            if (slots.length < 5)
                break;
            const client = {
                name: slots.shift(),
                clan: slots.shift(),
                country: parseInt(slots.shift(), 10),
                score: parseInt(slots.shift(), 10),
                isSpectator: parseInt(slots.shift(), 10) === 0,
            };
            if (type === "ext")
                slots.shift();
            if (addClient) {
                serverInfo.clients.push(client);
                serverInfo.clientCount++;
            }
            clientnum++;
        }
        return serverInfo;
    }
    unPackInt(slots) {
        const src = slots[0];
        if (src === "") {
            slots.shift();
            return 0;
        }
        let offset = 0;
        let byte = src[offset];
        const sign = (byte >> 6) & 0x01;
        let value = byte & 0x3f;
        while (true) {
            if (!(byte & 0x80))
                break;
            offset++;
            byte = src[offset];
            value |= (byte & 0x7f) << (offset * 7 - 1);
            if (offset === 4)
                break;
        }
        slots[0] = src.substring(0, offset + 1);
        if (sign) {
            value = -value;
        }
        return value;
    }
}
exports.ServerHandler = ServerHandler;
//# sourceMappingURL=serverhandler.js.map