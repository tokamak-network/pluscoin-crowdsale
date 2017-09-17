const Web3 = require("web3"); // web3@0.20

const providerUrl = "https://ropsten.infura.io";
const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

const crowdsaleArtifacts = require("../build/contracts/PLCCrowdsale.json");
const tokenArtifacts = require("../build/contracts/PLC.json");

// load crowdsale contract
const crowdsaleAbi = crowdsaleArtifacts.abi; // TODO: refer to README
const crowdsaleAddress = "0xf78ab9df126871d39d6473f53b25adfcb27eebe9"; // crowdsale contract address deployed at ropsten network

const crowdsale = web3.eth.contract(crowdsaleAbi).at(crowdsaleAddress);

// load token contract
const tokenAbi = tokenArtifacts.abi; // TODO: refer to README
const tokenAddress = "0x2a4c4c9a24fb1fd4e30c5ceb10fd19b2a461fbd5"; // token contract address deployed at ropsten network

const token = web3.eth.contract(tokenAbi).at(tokenAddress);

// sample parameteres
const userAddress = "0xf320CF84c9121E57292516aC2317F4C375c0ac93";
const baseRate = 200;

const currentRate = crowdsale.getRate();
const weiRaised = crowdsale.weiRaised();
const totalSupply = token.totalSupply();
const userTokenBalance = token.balanceOf(userAddress);
const userEthFunded = crowdsale.buyerFunded(false, userAddress).add(crowdsale.buyerFunded(true, userAddress));

// prepare logging
const bonusRate = (currentRate.toNumber() - baseRate) / baseRate;
const toFormatEth = wei => wei.div(1e18).toNumber().toFixed(2);

console.log(`
  bonus rate : ${ bonusRate.toFixed(0) }%
  total eth funded : ${ toFormatEth(weiRaised) }
  plc total supply : ${ toFormatEth(totalSupply) }
  user plc : ${ toFormatEth(userTokenBalance) }
  user eth funded : ${ toFormatEth(userEthFunded) }
`);
