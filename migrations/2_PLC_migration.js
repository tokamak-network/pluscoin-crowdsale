var PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
var GetTime = artifacts.require("test/GetTime.sol");

module.exports = function(deployer) {
  deployer.deploy(
    PLCCrowdsale,
    "0x62a40911c4b144a5f8dea7fa0aacc81c19400a5a",
    100000,
  );

  deployer.deploy(GetTime);

};
