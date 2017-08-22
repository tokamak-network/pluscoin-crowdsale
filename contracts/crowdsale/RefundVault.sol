pragma solidity ^0.4.11;

import '../math/SafeMath.sol';
import '../ownership/Ownable.sol';

/**
 * @title RefundVault
 * @dev This contract is used for storing funds while a crowdsale
 * is in progress. Supports refunding the money if crowdsale fails,
 * and forwarding it if crowdsale is successful.
 */
contract RefundVault is Ownable, SafeMath{

  enum State { Active, Refunding, Closed }

  mapping (address => uint256) public deposited;
  State public state;

  address devMultisig = address(0xbd545e6c84aab512c2fed7b9e03694ef2cead86be24b04b9c5bab73a1d8637af);

  address[5] reserveWallet = [  address(0x7ce2937db134b6f08ef34abe7e9dd5268ee25f4181b4da58be28702d68f01dfc),
  address(0xf235fc8e2902e0319dcae18125412bdc76a9ca288f4a31901bdc860661c2e175),
  address(0xd5d43be02fa35322a5dc8d5a9d6fae65dcfd66f697a4d7c9163148ca2e97f88a),
  address(0xb1b6a6571fc25604d248e3f5b29d9f80c807915775f43775fedf7b832d45fadf),
  address(0x99e1c27bceb43b844368a06cef69b09ee0ce349cca710016d42d8e5eaf189883)];

  event Closed();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  function RefundVault() {
    state = State.Active;
  }

  function deposit(address investor) onlyOwner payable {
    require(state == State.Active);
    deposited[investor] = add(deposited[investor], msg.value);
  }

  function close() onlyOwner {
    require(state == State.Active);
    state = State.Closed;

    uint256 balance = this.balance;

    uint256 devAmount = div(balance, 10);
    devMultisig.transfer(devAmount);

    uint reserveAmount = div(mul(balance, 9), 10);
    for(uint8 i = 0; i < 5; i++){
      reserveWallet[i].transfer(div(reserveAmount, 5));
    }

    Closed();
  }

  function enableRefunds() onlyOwner {
    require(state == State.Active);
    state = State.Refunding;
    RefundsEnabled();
  }

  function refund(address investor) {
    require(state == State.Refunding);
    uint256 depositedValue = deposited[investor];
    deposited[investor] = 0;
    investor.transfer(depositedValue);
    Refunded(investor, depositedValue);
  }
}
