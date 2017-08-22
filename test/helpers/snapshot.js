export function capture() {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        params: [],
        id,
      },
      (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result.result);
      },
    );
  });
}

export function restore(snapshotId) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [ snapshotId ],
        id,
      },
      (err, result) => {
        if (err) {
          reject(err);
        }

        resolve(result.result);
      },
    );
  });
}
