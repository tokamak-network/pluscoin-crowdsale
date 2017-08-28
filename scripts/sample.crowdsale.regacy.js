const Web3 = require("web3"); // web3@0.14
const moment = require("moment");

// output of `truffle compile`
const PLCArtifact = require("../build/contracts/PLC.json");
const PLCCrowdsaleArtifact = require("../build/contracts/PLCCrowdsale.json");
const RefundVaultArtifact = require("../build/contracts/RefundVault.json");
const MultiSigWalletArtifact = require("../build/contracts/MultiSigWallet.json");

const addresses = require("../addresses.json");

// instantiate web3
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

// global variables
const eth = web3.eth;
const ether = v => v * 10 ** 18;

const accounts = eth.accounts;

// contract instance
const token = eth.contract(PLCArtifact.abi).at(addresses.token);
const crowdsale = eth.contract(PLCCrowdsaleArtifact.abi).at(addresses.crowdsale);
const multiSig = eth.contract(MultiSigWalletArtifact.abi).at(addresses.multiSig);
const vault = eth.contract(RefundVaultArtifact.abi).at(addresses.vault);

const state = {
  registered: false,
  invested: false,
};

const main = async () => {
  try {
    await advanceBlock();
    const owner = accounts[ 0 ];
    const investor = accounts[ 2 ];

    const now = moment().unix();
    const block = (eth.getBlock("latest")).timestamp;

    const startTime = crowdsale.startTime.call();
    const endTime = crowdsale.endTime.call();

    console.log(`\t\t[Time]
block.timestamp:${ block }
now: \t\t${ now }
startTime: \t${ startTime }
endTime: \t${ endTime }
`);

    const weiRaised = crowdsale.weiRaised.call();

    console.log(`\t\t[Crowdsale]
weiRaised: \t\t ${ weiRaised }`);
    console.log();
    console.log();

    if (now < startTime) {
      console.log("wait until the sale starts");

      if (!state.registered) {
        await crowdsale.methods.register(investor).send({ from: owner });
        console.log("investor registered");
        state.registered = true;
      }
    } else if (startTime <= now && now <= endTime) {
      console.log("sale ongoing");

      if (!state.invested) {
        // const r = await crowdsale.methods.buyTokens(investor).send({
        //   from: investor,
        //   value: ether(10),
        // });

        const r = await eth.sendTransaction({
          from: investor,
          to: crowdsale.address,
          value: ether(10),
          gas: 200000,
        });

        console.log(r);
        console.log("investor : 0.1 eth");

        state.invested = true;
      }
    } else {
      console.log("sale ended");
    }
  } catch (e) {
    console.error(e);
  }

  console.log("------------------------");
  console.log();
  console.log();
};

setInterval(main, 2000);

function advanceBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: Date.now(),
    }, (err, res) => (err ? reject(err) : resolve(res)));
  });
}
