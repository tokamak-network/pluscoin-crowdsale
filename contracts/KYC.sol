pragma solidity ^0.4.11;

import './math/SafeMath.sol';
import './ownership/Ownable.sol';
import './lifecycle/Pausable.sol';

contract KYC is Ownable, SafeMath, Pausable {
  mapping (address => bool) public registeredAddress;

  event Registered(address indexed _addr);
  event Unregistered(address indexed _addr);

  modifier onlyRegistered(address _addr) {
    require(isRegistered(_addr));
    _;
  }

  function isRegistered(address _addr)
    public
    constant
    returns (bool)
  {
    return registeredAddress[_addr];
  }

  function register(address _addr)
    public
    onlyOwner
    whenNotPaused
  {
    require(_addr != address(0) && registeredAddress[_addr] == false);

    registeredAddress[_addr] = true;

    Registered(_addr);
  }

  function unregister(address _addr)
    public
    onlyOwner
    onlyRegistered(_addr)
  {
    registeredAddress[_addr] = false;

    Unregistered(_addr);
  }
}
