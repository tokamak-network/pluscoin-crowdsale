const fs = require("fs");
const path = require("path");
const moment = require("moment");

const KYC = artifacts.require("KYC.sol");
const PLCCrowdsale = artifacts.require("PLCCrowdsale.sol");
const PLC = artifacts.require("PLC.sol");
const RefundVault = artifacts.require("crowdsale/RefundVault.sol");
const MultiSig = artifacts.require("wallet/MultiSigWallet.sol");

let kycAddress;

module.exports = async function (deployer, network, accounts) {
  console.log("[accounts]");
  accounts.forEach((account, i) => console.log(`[${ i }]  ${ account }`));

  try {
    const maxEtherCap = 1 * 10 ** 18;
    const minEtherCap = 2 * 10 ** 17;

    const startTime = moment.utc("2017-09-21T05:30").unix();
    const startDate = moment.utc("2017-09-21T05:30");
    const endTime = moment.utc("2017-09-21T06:30").unix();

    const firstBonusDeadline = startDate.add(15, "minutes").unix();
    const secondBonusDeadline = startDate.add(10, "minutes").unix();
    const thirdBonusDeadline = startDate.add(10, "minutes").unix();
    const fourthBonusDeadline = startDate.add(10, "minutes").unix();

    const timelines = [
      startTime,
      firstBonusDeadline,
      secondBonusDeadline,
      thirdBonusDeadline,
      fourthBonusDeadline,
      endTime,
    ];

    const reserveWallet = [
      "0x922aa0d0e720caf10bcd7a02be187635a6f36ab0",
      "0x6267901dbb0055e12ea895fc768b68486d57dcf8",
      "0x236df55249ac7a6dfea613cd69ccd014c3cb8445",
    ];

    const kyc = await KYC.new();
    kycAddress = kyc.address;

    console.log("kyc deployed at", kycAddress);

    const multiSig = await MultiSig.new(reserveWallet, reserveWallet.length - 1); // 4 out of 5
    console.log("multiSig deployed at", multiSig.address);

    const token = await PLC.new();
    console.log("token deployed at", token.address);

    const vault = await RefundVault.new(multiSig.address, reserveWallet);
    console.log("vault deployed at", vault.address);

    /*eslint-disable */
    const crowdsale = await PLCCrowdsale.new(
      kycAddress,
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
