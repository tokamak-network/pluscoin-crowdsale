#### [Reference](https://github.com/ethereum/wiki/wiki/JSON-RPC)

#### Using [sendTransaction](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sendtransaction)
> __Unlock__ account before send request

```js
{
  "jsonrpc":"2.0",
  "method":"eth_sendTransaction",
  "params":[
    {
      "from": "0x91e9cc445e27efb3ae4bc0c782748010e7aab01e", // kyc owner account
      "to": "0x3d782870115f1a03bb5eb2547473d9f3e0462995", // kyc contract address
      "data": "0x4420e486000000000000000000000000[address to register as hex (without 0x)]",
      "gas":"0x11558", // appropriate gas limit
      "gasPrice":"0x4a817c800" // appropriate gas price
    }
  ],
  "id":1
}
```

###### Example
```bash
curl -X POST http://192.168.1.245:8545 --data '{"jsonrpc":"2.0","method":"eth_sendTransaction","params":[{"from":"0x91e9cc445e27efb3ae4bc0c782748010e7aab01e","to":"0x3d782870115f1a03bb5eb2547473d9f3e0462995","data":"0x4420e486000000000000000000000000e9436c159502a6912b048d8774f6ceff74b9e1e9"}],"id":1}'
```
