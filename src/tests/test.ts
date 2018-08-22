import { ServerHandler } from "../index";

const server = new ServerHandler("95.172.92.151", 8303, false);

server.requestInfo().then(data => {
  // tslint:disable-next-line:no-console
  console.log(data);
});
