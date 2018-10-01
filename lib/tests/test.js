"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const server = new index_1.ServerHandler("95.172.92.151", 8303, false);
server.requestInfo().then(data => {
    // tslint:disable-next-line:no-console
    console.log(data);
});
//# sourceMappingURL=test.js.map