const HttpServer = require('./httpServer')
const Blockchain = require('./blockchain')
const Operator = require('./operator')
const Miner = require('./miner')
const Node = require('./node')
const fs = require('fs')

var appdata = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : '/var/local');
var appdataPath = appdata.replace(/\\/g,'/') + '/Concord Core/';

module.exports = function concord (host, port, peers, logLevel, name) {
  host = process.env.HOST || host || '::'
  port = process.env.PORT || process.env.HTTP_PORT || port || 3001
  peers = (process.env.PEERS ? process.env.PEERS.split(',') : peers || [])

  // Slap Concord's seednode(s) into the initial peers list
  peers.push("195.206.181.235:3001")

  peers = peers.map((peer) => { return { url: peer } })
  logLevel = (process.env.LOG_LEVEL ? process.env.LOG_LEVEL : logLevel || 6)
  name = process.env.NAME || name || '1'

  if (!fs.existsSync(appdataPath)){
    try {
      fs.mkdirSync(appdataPath)
      fs.mkdirSync(appdataPath + name + '/')
    } catch(err) {
      throw 'Couldn\'t create "Concord Core" appdata directory'
    }
  }

  require('./util/consoleWrapper.js')(name, logLevel)

  console.info(`Starting Concord Core node ${name}`)

  let blockchain = new Blockchain(name)
  let operator = new Operator(name, blockchain)
  let miner = new Miner(blockchain, logLevel)
  let node = new Node(host, port, peers, blockchain)
  let httpServer = new HttpServer(node, blockchain, operator, miner)

  /* Resync against peers on a regular interval */
  setInterval(resync, 10 * 1000) // 10 seconds
  function resync () {
    node.peers.forEach((peer) => {
      node.syncWithPeer(peer)
    })
  }

  httpServer.listen(host, port)
}
