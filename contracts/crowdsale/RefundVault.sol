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

  address public devMultisig = 0x075451eaec6c450da3ca169e7187ad8b5b745459;

  address[5] reserveWallet = [  0x922aa0d0e720caf10bcd7a02be187635a6f36ab0,
  0x6267901dbb0055e12ea895fc768b68486d57dcf8,
  0x236df55249ac7a6dfea613cd69ccd014c3cb8445,
  0xceca4d86a45cfef2e6431b4a871123a23bef6d87,
  0x8afe4672155b070e0645c0c9fc50d8eb3eab9a7e];

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

  event Transferred(address _to, uint _value);

  function close() onlyOwner {
    require(state == State.Active);
    state = State.Closed;

    uint256 balance = this.balance;

    uint256 devAmount = div(balance, 10);
    devMultisig.transfer(devAmount);
    Transferred(devMultisig, devAmount);

    uint reserveAmount = div(mul(balance, 9), 10);
    for(uint8 i = 0; i < 5; i++){
      reserveWallet[i].transfer(div(reserveAmount, 5));
      Transferred(reserveWallet[i], div(reserveAmount, 5));
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
