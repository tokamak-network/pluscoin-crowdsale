var PLC = artifacts.require("token/PLC.sol");

module.exports = function(deployer) {
  deployer.deploy(PLC);
};
