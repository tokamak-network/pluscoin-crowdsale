pragma solidity ^0.4.13;

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

  function registerByList(address[] _addr)
    public
    onlyOwner
    whenNotPaused
  {
    for(uint256 i = 0; i < _addr.length; i++){
      require(_addr[i] != address(0) && registeredAddress[_addr[i]] == false);

      registeredAddress[_addr[i]] = true;

      Registered(_addr[i]);
    }
  }

  function unregister(address _addr)
    public
    onlyOwner
    onlyRegistered(_addr)
  {
    registeredAddress[_addr] = false;

    Unregistered(_addr);
  }

  function unregisterByList(address[] _addr)
    public
    onlyOwner
  {
    for(uint256 i=0; i < _addr.length; i++){
      require(isRegistered(_addr[i]));

      registeredAddress[_addr[i]] = false;

      Unregistered(_addr[i]);
    }

  }
}
