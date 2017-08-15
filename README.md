### [Documents](./docs)

### Prerequisite
1. [go-ethereum](https://github.com/ethereum/go-ethereum)
2. [node](https://nodejs.org/en/) > 6

```bash
# install related npm package
$ npm install -g truffle solc ethereumjs-testrpc
```

### Test Contract Using testrpc
```bash
# 1. run testrpc
$ testrpc

# 2. run truffle test in another terminal
$ truffle test
```

### Deploy Contract To Ethereum Network
```bash
# Setup go-ethereum client and configure truffle.js
# https://docs.google.com/presentation/d/1StD_UpDyC_YVbJeiDBaNZoJeKqFxdCmSe8RYY-znkcg/edit?usp=sharing

# 1. compile solidity source code
# output is located at build/contracts
$ truffle compile

# 2. deploy contracts to rinkeby network ethereum
# please refer to truffle.js for configuration
$ truffle migrate --network rinkeby
```
