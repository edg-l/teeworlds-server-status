# teeworlds-server-status
```js
var ServerInfo = require('../src/index').ServerInfo

var server1 = new ServerInfo('ger.ddnet.tw', 8303, 5000)

server1.on('info', () => {
  console.log(server1)
})

server1.startSending(() => console.log('Ready!'))

```

```js
var getServerInfo = require('../src/index').getServerInfo

getServerInfo('ger.ddnet.tw', 8303, (sv) => {
  console.log(sv)
})
```