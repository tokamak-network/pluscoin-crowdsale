var PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
var GetTime = artifacts.require("test/GetTime.sol");

module.exports = function(deployer) {
  deployer.deploy(
    PLCCrowdsale
  );

  deployer.deploy(GetTime);
};
