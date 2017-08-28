const Web3 = require("web3"); // web3@0.20
const moment = require("moment");
const contract = require("truffle-contract");

// output of `truffle compile`
const PLCArtifact = require("../build/contracts/PLC.json");
const PLCCrowdsaleArtifact = require("../build/contracts/PLCCrowdsale.json");
const RefundVaultArtifact = require("../build/contracts/RefundVault.json");
const MultiSigWalletArtifact = require("../build/contracts/MultiSigWallet.json");

const addresses = require("../addresses.json");

// instantiate web3
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const provider = web3.currentProvider;

// global variables / funcs
const eth = web3.eth;
const ether = v => web3.toWei(v);
const wei = v => (new web3.BigNumber(v)).toExponential();

const accounts = eth.accounts;

// contract object
const PLC = contract(PLCArtifact);
const PLCCrowdsale = contract(PLCCrowdsaleArtifact);
const MultiSigWallet = contract(MultiSigWalletArtifact);
const RefundVault = contract(RefundVaultArtifact);

PLC.setProvider(provider);
PLCCrowdsale.setProvider(provider);
MultiSigWallet.setProvider(provider);
RefundVault.setProvider(provider);

// contract instance
const token = PLC.at(addresses.token);
const crowdsale = PLCCrowdsale.at(addresses.crowdsale);
const multiSig = MultiSigWallet.at(addresses.multiSig);
const vault = RefundVault.at(addresses.vault);

const state = {
  registered: false,
  invested: false,
  investTx: "",
  finalized: false,
  finalizedTx: "",
};

const main = async () => {
  await advanceBlock();
  const owner = accounts[ 0 ];
  const investor = accounts[ 2 ];

  try {
    const now = moment().unix();
    const block = eth.getBlock("latest").timestamp;

    const startTime = await crowdsale.startTime();
    const endTime = await crowdsale.endTime();

    console.log(`\t\t[Time]
block.timestamp: ${ block }
now: \t\t ${ now }
startTime: \t ${ startTime }
endTime: \t ${ endTime }

\t\t[Ether Balance]
weiRaised: \t\t ${ wei(await crowdsale.weiRaised()) }
crowdsale: \t\t ${ wei(await eth.getBalance(crowdsale.address)) }
vault: \t\t\t ${ wei(await eth.getBalance(vault.address)) }

\t\t[Token Balance]
investor: \t\t ${ wei(await token.balanceOf(investor)) }
`);

    if (state.finalized) {
    }

    console.log();

    console.log();
    console.log();

    if (now < startTime) {
      console.log("wait until the sale starts");

      if (!state.registered) {
        await crowdsale.register(investor, { from: owner });
        console.log("investor registered");
        state.registered = true;
      }
    } else if (startTime <= now && now <= endTime) {
      console.log("sale ongoing");

      if (!state.invested) {
        const isRegistered = await crowdsale.isRegistered(investor);
        console.log(`isRegistered: ${ isRegistered }`);

        // const r = await crowdsale.buyTokens(investor, {
        //   from: investor,
        //   value: ether(10),
        // });

        const r = await eth.sendTransaction({
          from: investor,
          to: crowdsale.address,
          value: ether(10),
          gas: 200000,
        });

        state.investTx = r;
        state.invested = true;
      }
    } else {
      console.log("sale ended");

      if (!state.finalized) {
        const r = await crowdsale.finalize();

        state.finalizedTx = r;
        state.finalized = true;
      }
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
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: Date.now(),
    }, (err, res) => (err ? reject(err) : resolve(res)));
  });
}
