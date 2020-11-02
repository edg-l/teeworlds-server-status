import { ServerHandler } from '../index';

const server = new ServerHandler('165.227.139.80', 8298, false);

server.requestInfo().then((data) => {
    // tslint:disable-next-line:no-console
    console.log(data);
});
