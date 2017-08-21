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

  address devMultisig = 0x01;
  address[5] reserveWallet = [0x11,0x22,0x33,0x44,0x55];

  event Closed();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  function RefundVault() {
    state = State.Active;
  }

  function deposit(address investor) onlyOwner payable {
    require(state == State.Active);
    deposited[investor] = add(deposited[investor],msg.value);
  }

  function close() onlyOwner {
    require(state == State.Active);
    state = State.Closed;
    Closed();

    uint256 balance = this.balance;

    uint256 devAmount = div(balance,10);
    devMultisig.transfer(devAmount);

    uint reserveAmount = div(mul(balance,9),10);
    for(uint8 i=0;i<5;i++){
      reserveWallet[i].transfer(div(reserveAmount,5));
    }

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
