var PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
// var PLC = artifacts.require("token/PLC.sol");

module.exports = function(deployer) {
  deployer.deploy(
    PLCCrowdsale,
    1505520000,
    1507680000,
    200,
    "0x62a40911c4b144a5f8dea7fa0aacc81c19400a5a",
    100000
    );

  // deployer.deploy(PLC);
};
