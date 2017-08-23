const PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
const PLC = artifacts.require("token/PLC.sol");
const RefundVault = artifacts.require("crowdsale/RefundVault.sol");

module.exports = async function (deployer) {

    const token = await PLC.new();
    console.log(token.address);
    const vault = await RefundVault.new();
    console.log(vault.address);
    const crowdsale = await PLCCrowdsale.new(token.address,vault.address);
    console.log(crowdsale.address);

    await token.transferOwnership(crowdsale.address);
    await vault.transferOwnership(crowdsale.address);

};
