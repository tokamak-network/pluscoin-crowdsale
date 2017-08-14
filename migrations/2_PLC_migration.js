var PLCToken = artifacts.require("token/PLCToken.sol");

module.exports = function(deployer) {
  deployer.deploy(PLCToken);
};
