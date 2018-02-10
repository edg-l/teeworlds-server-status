# teeworlds-server-status
```js
var ServerInfo = require('teeworlds-server-status').ServerInfo

var server1 = new ServerInfo('ger.ddnet.tw', 8303, 5000)

server1.on('info', () => {
  console.log(server1)
})

server1.startSending(() => console.log('Ready!'))

```

```js
var getServerInfo = require('teeworlds-server-status').getServerInfo

getServerInfo('ger.ddnet.tw', 8303, (sv) => {
  console.log(sv)
})
```