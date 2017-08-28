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

  address public devMultisig;

  address[5] public reserveWallet;

  event Closed();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  function RefundVault(address _devMultiSig, address[5] _reserveWallet) {
    state = State.Active;
    devMultisig = _devMultiSig;
    reserveWallet = _reserveWallet;
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
