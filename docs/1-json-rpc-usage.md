#### [Reference](https://github.com/ethereum/wiki/wiki/JSON-RPC)

#### Environment
1. geth conencted to rinkeby network is running on `192.168.1.245`. So JSON-RPC endpoint will be `http://192.168.1.245:8545`
2. coinbase address is [0x98a03d4db807298cb9d79e1cb7a5960e191ce3de](https://rinkeby.etherscan.io/address/0x98a03d4db807298cb9d79e1cb7a5960e191ce3de)

#### 1. [getBalance](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getbalance)

Returns the balance of the account of given address.

```js
{
  "jsonrpc":"2.0",
  "method":"eth_getBalance",
  "params":[ // [ address, block number or string ]
    "0x98a03d4db807298cb9d79e1cb7a5960e191ce3de",
    "latest"
  ],
  "id":1
}
```

###### Example
```bash
# Request
curl -X POST http://192.168.1.245:8545 --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x98a03d4db807298cb9d79e1cb7a5960e191ce3de", "latest"],"id":1}'

# Result : coinbase address has 36.8 Eth
{"jsonrpc":"2.0","id":1,"result":"0x1fedc16ecad966800"} # 36811322660000000000 Wei, 36.8 Eth
```

#### 2. [sendTransaction](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sendtransaction)
> __Unlock__ account before send request

Creates new message call transaction or a contract creation, if the data field contains code.

```js
{
  "jsonrpc":"2.0",
  "method":"eth_sendTransaction",
  "params":[ // [ Object : refer to https://github.com/ethereum/wiki/wiki/JSON-RPC#parameters-22 ]
    {
      "from":"0x91e9cc445e27efb3ae4bc0c782748010e7aab01e",
      "to":"0x3d782870115f1a03bb5eb2547473d9f3e0462995",
      "value":"0xde0b6b3a7640000"
    }
  ],
  "id":1
}
```

###### Example
```bash
# Request
curl -X POST http://192.168.1.245:8545 --data '{"jsonrpc":"2.0","method":"eth_sendTransaction","params":[{"from":"0x91e9cc445e27efb3ae4bc0c782748010e7aab01e","to":"0x3d782870115f1a03bb5eb2547473d9f3e0462995","value":"0xde0b6b3a7640000"}],"id":1}'

# Result : transaction hash returned
{"jsonrpc":"2.0","id":1,"result":"0x332c59d151df8e753f1e223f7a8ec72f81c107d886f6d6ad12116187baa76be3"}

# check https://rinkeby.etherscan.io/tx/0x7fe2086a3bf7b71a66153d9940f28fb7f4bf92d0fb33337348330a9f24a643ea
```

#### 3. [getTransactionReceipt](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_gettransactionreceipt)

Returns the receipt of a transaction by transaction hash.

__Note__ That the receipt is not available for pending transactions.


```js
{
  "jsonrpc":"2.0",
  "method":"eth_getTransactionReceipt",
  "params":[ // [ transaction hash ]
    "0x271b8a686cb2abeb9a1df42f202a91a834ec6fa32b0c83b14a845f25760ccef7"
  ],
  "id":1
}
```

###### Example
```bash
# Request
curl -X POST http://192.168.1.245:8545 --data '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0x271b8a686cb2abeb9a1df42f202a91a834ec6fa32b0c83b14a845f25760ccef7"],"id":1}'

# Result : transaction hash returned
{
  "jsonrpc":"2.0",
  "id":1,
  "result":{
    "blockHash":"0xe4d413e8129baa87b206cd18be44541782b4be9c2744f5c867732f4579dc9f95",
    "blockNumber":"0xade71",
    "root":"0x53785ead3f26f88f9bbe8dd2d5bb819a964fdfdea9603fbb616f3efa74d6a04d",
    "from":"0x98a03d4db807298cb9d79e1cb7a5960e191ce3de",
    "to":"0x86d597f1a1e32a799c072805b9f0410ed9fe7885",
    "transactionHash":"0x271b8a686cb2abeb9a1df42f202a91a834ec6fa32b0c83b14a845f25760ccef7",
    "transactionIndex":"0x4",
    "contractAddress":null,
    "cumulativeGasUsed":"0x3f56b",
    "gasUsed":"0x102ab",
    "logs":[
      {
        "address":"0x86d597f1a1e32a799c072805b9f0410ed9fe7885",
        "topics":[
          "0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885",
          "0x00000000000000000000000098a03d4db807298cb9d79e1cb7a5960e191ce3de"
        ],
        "data":"0x0000000000000000000000000000000000000000000000000000000000000064",
        "blockNumber":"0xade71",
        "transactionHash":"0x271b8a686cb2abeb9a1df42f202a91a834ec6fa32b0c83b14a845f25760ccef7",
        "transactionIndex":"0x4",
        "blockHash":"0xe4d413e8129baa87b206cd18be44541782b4be9c2744f5c867732f4579dc9f95",
        "logIndex":"0x4",
        "removed":false
      }
    ],
    "logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000400800000000000000000000000000000080000000000000000002000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  }
}

# check https://rinkeby.etherscan.io/tx/0x271b8a686cb2abeb9a1df42f202a91a834ec6fa32b0c83b14a845f25760ccef7
```
