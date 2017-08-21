const PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
const GetTime = artifacts.require("test/GetTime.sol");

module.exports = function (deployer) {
    deployer.deploy(PLCCrowdsale);
    deployer.deploy(GetTime);
};
