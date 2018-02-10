# teeworlds-server-status
```js
var ServerInfo = require('teeworlds-server-status')

var server1 = new ServerInfo('localhost', 8304, 5000)

server1.on('info', () => {
  console.log(server1)
})

server1.startSending(() => console.log('Ready!'))
```
