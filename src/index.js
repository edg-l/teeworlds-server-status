var debug = require('debug')('teeworlds-server-info')
const dgram = require('dgram')
const crypto = require('crypto')
const dns = require('dns')

class ServerInfo {
  /**
   * The ServerInfo constructor.
   * @param {String} ip The address of the server.
   * @param {Number} port The port of the server.
   * @param {Number} fetchInterval The delay in ms between info requests.
   * @param {Boolean} ignoreToken Whether to ignore the token of the server.
   */
  constructor (ip, port, fetchInterval = 30000, ignoreToken = true) {
    this.port = port
    this.ip = ip
    this.fetchInterval = fetchInterval
    this.client = dgram.createSocket('udp4')
    this.ignoreToken = ignoreToken
    this.onInfo = []
    this.waitingResponse = false

    this.client.on('error', (err) => {
      if (err) throw err
      this.client.close()
    })

    this.client.on('message', (packet, rinfo) => {
      debug(`client got message: ${packet} from ${rinfo.address}:${rinfo.port}`)
      if (rinfo.address === this.ip && rinfo.port === this.port) {
        this.waitingResponse = false
        this.parsePacket(packet)
        this.onInfo.forEach(cb => cb(this))
      }
    })

    this.client.on('listening', () => {
      const address = this.client.address()
      debug(`Client listening on ${address.address}:${address.port}`)

      // maybe add a timeout with the frequency and make a event callback
      if (this.fetchInterval !== 0) {
        setInterval(() => {
          this.sendRequest()
        }, this.fetchInterval)
      }
      this.sendRequest()
    })
  }

  closeSocket () {
    this.client.close()
  }

  startSending (cb = () => {}) {
    dns.resolve4(this.ip, (err, ips) => {
      if (err) throw err

      this.ip = ips[0]

      this.client.bind()
      cb.call()
    })
  }

  on (event, cb) {
    switch (event) {
      case 'info':
      {
        this.onInfo.push(cb)
        break
      }
    }
  }

  sendRequest () {
    const buffer = Buffer.alloc(15)
    buffer.write('xe', 0, 2)
    crypto.randomFillSync(buffer, 2, 2)
    buffer.fill(0xff, 6, 10)
    buffer.write('gie3', 10, 4)
    crypto.randomFillSync(buffer, 14, 1)
    this.extraToken = buffer.readIntBE(2, 2)
    this.token = buffer.readIntBE(14, 1)

    debug(`Sending buffer: ${buffer}`)
    debug(`New extraToken: ${this.extraToken}`)
    debug(`New token: ${this.token}`)

    this.client.send(buffer, this.port, this.ip, (err, bytes) => {
      if (err) throw err
    })
    debug(`Sent info request to ${this.ip}:${this.port}`)
    this.waitingResponse = true
  }

  sendPacket (buffer, cb) {
    this.client.send(buffer, this.port, this.ip, cb)
  }

  /**
   * Parses the packet and fills with info
   * @param {Buffer} buffer The received packet
   */
  parsePacket (buffer) {
    this.buffer = buffer
    var type = buffer.subarray(10, 14).toString()
    let initClients = false
    let stype = ''

    if (type === 'inf3') {
      type = 'vanilla'
      initClients = true
    } else if (type === 'dtsf') {
      type = '64legacy'
    } else if (type === 'iext') {
      type = 'ext'
      initClients = true
    } else if (type === 'iex+') {
      type = 'extmore'
      stype = 'ext'
    }

    if (type !== 'ext') {
      stype = type
    }

    var slots = String(this.buffer.subarray(14, this.buffer.length)).split('\x00')
    // debug(slots)
    var token = parseInt(slots.shift())
    debug(`Type is ${type}`)
    debug(`Token is ${token & 0xff}`)

    if ((token & 0xff) !== this.token) {
      debug(`Token is invalid: ${token & 0xff} != ${this.token}`)
      if (!this.ignoreToken) {
        return
      }
    }

    if (stype === 'ext') {
      if ((token & 0xffff00) >> 8 !== this.extraToken) {
        debug(`Token is invalid (extraToken): ${(token & 0xffff00) >> 8} != ${this.extraToken}`)
        if (!this.ignoreToken) {
          return
        }
      }
    }

    if (type !== 'extmore') {
      this.version = slots.shift()
      this.name = slots.shift()
      this.map = slots.shift()

      if (type === 'ext') {
        this.mapcrc = parseInt(slots.shift())
        this.mapsize = parseInt(slots.shift())

        debug(`Map crc is: ${this.mapcrc}`)
        debug(`Map size is: ${this.mapsize}`)
      }

      this.gameType = slots.shift()
      this.password = parseInt(slots.shift()) === 1
      this.playerCount = parseInt(slots.shift())
      this.maxPlayerCount = parseInt(slots.shift())
      this.clientCount = parseInt(slots.shift())
      this.maxClientCount = parseInt(slots.shift())

      debug(`Version is: ${this.version}`)
      debug(`Name is: ${this.name}`)
      debug(`gametype is: ${this.gameType}`)
      debug(`password is: ${this.password}`)
      debug(`numplayers is: ${this.playerCount}`)
      debug(`maxplayers is: ${this.maxPlayerCount}`)
      debug(`numclients is: ${this.clientCount}`)
      debug(`maxclients is: ${this.maxClientCount}`)
    }

    if (initClients) {
      this.clients = []
      this._clientCount = 0
    }

    let clientnum = 0
    if (this.type === '64legacy') {
      clientnum = this.unPackInt(slots)
      if (clientnum < 0 || clientnum >= 64) {
        return
      }
    }
    let packetnum = 0
    if (this.type === 'extmore') {
      packetnum = parseInt(slots.shift())
      // 0 is reserved for the main ext packet
      if (packetnum <= 0 || packetnum >= 64) {
        return
      }
    }

    if (type === 'ext') {
      this.reserved = slots.shift()
      if (!this.clientPackets) this.clientPackets = []
      if (!(packetnum in this.clientPackets)) this.clientPackets.push(packetnum)
      else return
    }

    while (true) {
      if (slots.length === 0) break

      if (type === 'vanilla' && this._clientCount === 16) break

      if (this._clientCount === 64) break

      let addClient = true

      if (type === '64legacy') {
        if (!this._clientNumbers) {
          this._clientNumbers = []
        }

        if (!(clientnum in this._clientNumbers)) this._clientNumbers.push(clientnum)
        else addClient = false
      }

      // Check if slots is enough big so that it contains another player
      if (slots.length < 5) break

      let client = {}

      client.name = slots.shift()
      client.clan = slots.shift()
      client.country = parseInt(slots.shift())
      client.score = parseInt(slots.shift())
      client.isSpectator = parseInt(slots.shift()) === 0

      if (type === 'ext') slots.shift()

      if (addClient) {
        this.clients.push(client)
        this._clientCount++
      }

      clientnum++
    }
    debug(this.clients)
  }

  unPackInt (slots) {
    let src = slots[0]
    debug('src is {0}', src)
    if (src === '') {
      slots.shift()
      return 0
    }

    let offset = 0

    let byte = src[offset]
    let sign = (byte >> 6) & 0x01
    let value = byte & 0x3f

    while (true) {
      if (!(byte & 0x80)) break

      offset++

      byte = src[offset]
      value |= (byte & 0x7f) << (offset * 7 - 1)
      if (offset === 4) break
    }

    slots[0] = src.substring(0, offset + 1)

    if (sign) {
      value = -value
    }

    return value
  }
}

function getServerInfo (ip, port, cb) {
  let server = new ServerInfo(ip, port, 0)
  server.on('info', (sv) => {
    sv.closeSocket()
    cb(sv)
  })
  server.startSending(() => {
  })
}

module.exports = exports = {
  ServerInfo: ServerInfo,
  getServerInfo: getServerInfo
}
