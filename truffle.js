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
      from: "0x91e9cc445e27efb3ae4bc0c782748010e7aab01e",
      gas: 4000000,
      gasPrice: 20e9
    }
  }
};
