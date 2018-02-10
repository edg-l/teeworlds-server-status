var getServerInfo = require('../src/index').getServerInfo

getServerInfo('84.38.65.222', 8303, (sv) => {
  console.log(sv)
})
