pragma solidity ^0.4.13;

import './math/SafeMath.sol';
import './ownership/Ownable.sol';
import './lifecycle/Pausable.sol';

contract KYC is Ownable, SafeMath, Pausable {
  mapping (address => bool) public registeredAddress;
  mapping (address => bool) public admin;

  event Registered(address indexed _addr);
  event Unregistered(address indexed _addr);
  event NewAdmin(address indexed _addr);

  modifier onlyRegistered(address _addr) {
    require(isRegistered(_addr));
    _;
  }

  modifier onlyAdmin() {
    require(admin[msg.sender]);
    _;
  }

  function KYC() {
    admin[msg.sender] = true;
  }

  function setAdmin(address _addr)
    public
    onlyOwner
  {
    require(_addr != address(0) && admin[_addr] == false);
    admin[_addr] = true;

    NewAdmin(_addr);
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
    onlyAdmin
    whenNotPaused
  {
    require(_addr != address(0) && registeredAddress[_addr] == false);

    registeredAddress[_addr] = true;

    Registered(_addr);
  }

  function registerByList(address[] _addrs)
    public
    onlyAdmin
    whenNotPaused
  {
    for(uint256 i = 0; i < _addrs.length; i++) {
      require(_addrs[i] != address(0) && registeredAddress[_addrs[i]] == false);

      registeredAddress[_addrs[i]] = true;

      Registered(_addrs[i]);
    }
  }

  function unregister(address _addr)
    public
    onlyAdmin
    onlyRegistered(_addr)
  {
    registeredAddress[_addr] = false;

    Unregistered(_addr);
  }

  function unregisterByList(address[] _addrs)
    public
    onlyAdmin
  {
    for(uint256 i = 0; i < _addrs.length; i++) {
      require(isRegistered(_addrs[i]));

      registeredAddress[_addrs[i]] = false;

      Unregistered(_addrs[i]);
    }

  }
}
