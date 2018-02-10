var getServerInfo = require('../src/index').getServerInfo

getServerInfo('ger.ddnet.tw', 8303, (sv) => {
  console.log(sv)
})
