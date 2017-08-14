module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      host: "192.168.1.245",
      port: 8545,
      network_id: "4",
      from: "0x98a03d4db807298cb9d79e1cb7a5960e191ce3de"
    }
  }
};
