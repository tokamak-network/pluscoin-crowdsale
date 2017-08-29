const Migrations = artifacts.require("lifecycle/Migrations.sol");

module.exports = function (deployer, network, accounts) {
  accounts.forEach((account, i) => console.log(`[${ i }]  ${ account }`));

  deployer.deploy(Migrations);
};
