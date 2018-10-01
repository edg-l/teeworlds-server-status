import { IServerInfo } from "./serverinfo";
export declare class ServerHandler {
    address: string;
    port: number;
    ignoreToken: boolean;
    constructor(address: string, port?: number, ignoreToken?: boolean);
    requestInfo(): Promise<IServerInfo | null>;
    private sendRequest;
    private parsePacket;
    private unPackInt;
}
//# sourceMappingURL=serverhandler.d.ts.map