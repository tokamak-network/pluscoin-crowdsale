// http://truffleframework.com/tutorials/using-infura-custom-provider
const axios = require("axios");
const bip39 = require("bip39");
const hdkey = require("ethereumjs-wallet/hdkey");
const ProviderEngine = require("web3-provider-engine");
const WalletSubprovider = require("web3-provider-engine/subproviders/wallet.js");
const Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
const Web3 = require("web3");

require('dotenv').config();
const mnemonic = process.env.MNEMONIC || "onther metaps onther metaps onther metaps onther metaps onther metaps onther metaps ";

const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));

const hdPath = "m/44'/60'/0'/1/";
const wallet = hdwallet.derivePath(`${ hdPath }0`).getWallet();

const makePath = (_path, _n) => Array.from(Array(_n).keys()).map((_, i) => `${ _path }${ i }`);
const makeWallet = _path => hdwallet.derivePath(`${ _path }0`).getWallet();
const getAddress = _wallet => `0x${ _wallet.getAddress().toString("hex") }`;

const paths = makePath(hdPath, 40);
const wallets = paths.map(makeWallet);
const addresses = wallets.map(getAddress);

const faucet = address => axios.get(`http://faucet.ropsten.be:3001/donate/${ address }`)
  .then(console.log)
  .catch(console.error);

addresses.forEach(faucet);
