pragma solidity ^0.4.11;

import './math/SafeMath.sol';
import './ownership/Ownable.sol';
import './lifecycle/Pausable.sol';

/**
 * @title KYC
 * @dev KYC
 */
contract KYC is Ownable, SafeMath, Pausable {
  mapping (address => bool)    public knownAddress;
  mapping (address => uint256) public knownPreSaledAmount;

  event AddressAdded(address indexed _addr);
  event AddressPreSaled(address indexed _addr, uint256 _amount);

  function addUser(address _addr) public onlyOwner whenNotPaused {
    knownAddress[_addr] = true;
    AddressAdded(_addr);
  }

  function preSaled(address _addr, uint256 _amount) public onlyOwner whenNotPaused {
    knownPreSaledAmount[_addr] = _amount;
    AddressPreSaled(_addr, _amount);
  }
}
