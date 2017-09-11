pragma solidity ^0.4.13;

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
  mapping (address => uint256) public refunded;
  State public state;

  address public devMultisig;

  address[5] public reserveWallet;

  event Closed();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  /**
   * @dev This constructor sets the addresses of multi-signature wallet and
   * 5 reserve wallets.
   * and forwarding it if crowdsale is successful.
   * @params _devMultiSig address The address of multi-signature wallet.
   * @params _reserveWallet address[5] The addresses of reserve wallet.
   */
  function RefundVault(address _devMultiSig, address[5] _reserveWallet) {
    state = State.Active;
    devMultisig = _devMultiSig;
    reserveWallet = _reserveWallet;
  }

  /**
   * @dev This function is called when user buy tokens. Only RefundVault
   * contract stores the Ether user sent which forwarded from crowdsale
   * contract.
   * @params investor address The address who buy the token from crowdsale.
   */
  function deposit(address investor) onlyOwner payable {
    require(state == State.Active);
    deposited[investor] = add(deposited[investor], msg.value);
  }

  event Transferred(address _to, uint _value);

  /**
   * @dev This function is called when crowdsale is successfully finalized.
   */
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

  /**
   * @dev This function is called when crowdsale is unsuccessfully finalized
   * and refund is required.
   */
  function enableRefunds() onlyOwner {
    require(state == State.Active);
    state = State.Refunding;
    RefundsEnabled();
  }

  /**
   * @dev This function allows for user to refund Ether.
   */
  function refund(address investor) returns (bool) {
    require(state == State.Refunding);

    if (refunded[investor] > 0) {
      return false;
    }

    uint256 depositedValue = deposited[investor];
    deposited[investor] = 0;
    refunded[investor] = depositedValue;
    investor.transfer(depositedValue);
    Refunded(investor, depositedValue);

    return true;
  }

}
