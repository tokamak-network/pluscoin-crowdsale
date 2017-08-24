const PLCCrowdsale = artifacts.require("PLCCrowdsale.sol");
const PLC = artifacts.require("PLC.sol");
const RefundVault = artifacts.require("crowdsale/RefundVault.sol");
const MultiSig = artifacts.require("wallet/MultiSigWallet.sol");

module.exports = async function (deployer, network, accounts) {
  const reserveWallet = accounts.slice(3, 3 + 5);

  const multiSig = await MultiSig.new(reserveWallet, reserveWallet.length - 1); // 4 out of 5
  console.log("multiSig deployed at", multiSig.address);

  const token = await PLC.new();
  console.log("token deployed at", token.address);

  const vault = await RefundVault.new(multiSig.address, reserveWallet);
  console.log("vault deployed at", vault.address);

  const crowdsale = await PLCCrowdsale.new(token.address, vault.address, multiSig.address, reserveWallet);
  console.log("crowdsale deployed at", crowdsale.address);

  await token.transferOwnership(crowdsale.address);
  await vault.transferOwnership(crowdsale.address);
};
