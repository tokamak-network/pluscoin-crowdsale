require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 10000000,
    },
    rinkeby: {
      host: "192.168.1.245", // go-ethereum conencted to rinkeby network is running on 192.168.1.245
      port: 8545,
      network_id: "4",
      from: "0x91e9cc445e27efb3ae4bc0c782748010e7aab01e",
      gas: 4000000,
      gasPrice: 20e9
    }
  }
};
