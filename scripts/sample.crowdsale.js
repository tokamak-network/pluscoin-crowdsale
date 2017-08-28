const Web3 = require("web3"); // web3@1.0
const moment = require("moment");

// output of `truffle compile`
const PLCArtifact = require("../build/contracts/PLC.json");
const PLCCrowdsaleArtifact = require("../build/contracts/PLCCrowdsale.json");
const RefundVaultArtifact = require("../build/contracts/RefundVault.json");
const MultiSigWalletArtifact = require("../build/contracts/MultiSigWallet.json");

const addresses = require("../addresses.json");

// instantiate web3
const web3 = new Web3();
web3.setProvider("http://localhost:8545");

// global variables
const eth = web3.eth;

let accounts;
eth.getAccounts().then((a) => { accounts = a; });

// contract instance
const token = new eth.Contract(PLCArtifact.abi, addresses.token);
const crowdsale = new eth.Contract(PLCCrowdsaleArtifact.abi, addresses.crowdsale);
const multiSig = new eth.Contract(MultiSigWalletArtifact.abi, addresses.multiSig);
const vault = new eth.Contract(RefundVaultArtifact.abi, addresses.vault);

const main = async () => {
  const owner = accounts[ 0 ];

  try {
    const now = moment().unix();

    const startTime = await crowdsale.methods.startTime().call();
    const endTime = await crowdsale.methods.endTime().call();

    console.log(`\t\t[Time]
now: \t\t${ now }
startTime: \t${ startTime }
endTime: \t${ endTime }
`);
  } catch (e) {
    console.error(e);
  }
};

setInterval(main, 1000);
