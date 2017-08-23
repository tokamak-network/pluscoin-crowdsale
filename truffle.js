require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 1000000000,
    },
    rinkeby: {
      host: "192.168.1.245", // go-ethereum conencted to rinkeby network is running on 192.168.1.245
      port: 8545,
      network_id: "4",
      from: "0x3d782870115f1a03bb5eb2547473d9f3e0462995",
      gas: 4000000,
      gasPrice: 20e9,
    },
  },
};
