const fs = require("fs");
const path = require("path");
const moment = require("moment");

const PLCCrowdsale = artifacts.require("PLCCrowdsale.sol");
const PLC = artifacts.require("PLC.sol");
const RefundVault = artifacts.require("crowdsale/RefundVault.sol");
const MultiSig = artifacts.require("wallet/MultiSigWallet.sol");

module.exports = async function (deployer, network, accounts) {
  console.log("[accounts]");
  accounts.forEach((account, i) => console.log(`[${ i }]  ${ account }`));

  try {
    // const maxEtherCap = 100000 * 10 ** 18;
    // const minEtherCap = 30000 * 10 ** 18;
    // const timelines = [1506384000, 1506643200, 1506902400, 1507161600, 1507420800, 1507593600];

    // for demo
    const step = network === "development" ? "seconds" : "minutes";
    const timelines = [
      moment().add(10, step).unix(), // start
      moment().add(15, step).unix(),
      moment().add(20, step).unix(),
      moment().add(25, step).unix(),
      moment().add(30, step).unix(),
      moment().add(35, step).unix(), // end
    ];
    const maxEtherCap = 5 * 10 ** 18;
    const minEtherCap = 1 * 10 ** 18;

    const reserveWallet = [
      "0x922aa0d0e720caf10bcd7a02be187635a6f36ab0",
      "0x6267901dbb0055e12ea895fc768b68486d57dcf8",
      "0x236df55249ac7a6dfea613cd69ccd014c3cb8445",
      "0xceca4d86a45cfef2e6431b4a871123a23bef6d87",
      "0x8afe4672155b070e0645c0c9fc50d8eb3eab9a7e",
    ];

    const multiSig = await MultiSig.new(reserveWallet, reserveWallet.length - 1); // 4 out of 5
    console.log("multiSig deployed at", multiSig.address);

    const token = await PLC.new();
    console.log("token deployed at", token.address);

    const vault = await RefundVault.new(multiSig.address, reserveWallet);
    console.log("vault deployed at", vault.address);

    /*eslint-disable */
    const crowdsale = await PLCCrowdsale.new(
      token.address,
      vault.address,
      multiSig.address,
      reserveWallet,
      timelines,
      maxEtherCap,
      minEtherCap
    );
    /*eslint-enable */

    console.log("crowdsale deployed at", crowdsale.address);

    await token.transferOwnership(crowdsale.address);
    await vault.transferOwnership(crowdsale.address);

    fs.writeFileSync(path.join(__dirname, "../addresses.json"), JSON.stringify({
      multiSig: multiSig.address,
      token: token.address,
      vault: vault.address,
      crowdsale: crowdsale.address,
    }, undefined, 2));
  } catch (e) {
    console.error(e);
  }
};
