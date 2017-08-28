pragma solidity ^0.4.11;

import './math/SafeMath.sol';
import './ownership/Ownable.sol';
import './lifecycle/Pausable.sol';

/**
 * @title KYC
 * @dev KYC
 */
contract KYC is Ownable, SafeMath, Pausable {
  mapping (address => bool)    public registeredAddress;
  mapping (bytes32 => address) public registeredKey;
  mapping (address => uint256) public registeredAmount;

  event Registered(address indexed _addr);
  event RegisteredWithPreSale(address indexed _addr, uint256 _amount);

  event RegisteredWithKey(bytes32 indexed _key, address indexed _addr);
  event RegisteredWithKeyAndPreSale(bytes32 indexed _key, address indexed _addr, uint256 _amount);

  event Unregistered(address indexed _addr);
  event UnregisteredWithKey(bytes32 indexed _key, address indexed _addr);

  modifier onlyRegistered(address _addr) {
    require(isRegistered(_addr));
    _;
  }

  modifier onlyRegisteredWithKey(bytes32 _key, address _addr) {
    require(isRegisteredWithKey(_key, _addr));
    _;
  }

  function getAddress(bytes32 _key) public constant returns (address) {
    return registeredKey[_key];
  }

  function isRegistered(address _addr) public constant returns (bool) {
    return registeredAddress[_addr];
  }

  function isRegisteredWithKey(bytes32 _key, address _addr) public constant  returns (bool) {
    return registeredAddress[_addr] && registeredKey[_key] == _addr;
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

  // register account with key and presale
  function registerWithPreSale(
    address _addr,
    uint256 _amount)
    public
    onlyOwner
    whenNotPaused
  {
    require(_addr != address(0) && registeredAddress[_addr] == false);

    registeredAddress[_addr] = true;
    registeredAmount[_addr] = _amount;

    RegisteredWithPreSale(_addr, _amount);
  }

  // register account with key
  function registerWithKey(
    bytes32 _key,
    address _addr)
    public
    onlyOwner
    whenNotPaused
  {
    require(_key != bytes32(0) && registeredKey[_key] == address(0));
    require(_addr != address(0) && registeredAddress[_addr] == false);

    registeredAddress[_addr] = true;
    registeredKey[_key] = _addr;

    RegisteredWithKey(_key, _addr);
  }

  // register account with key and presale
  function registerWithKeyAndPreSale(
    bytes32 _key,
    address _addr,
    uint256 _amount)
    public
    onlyOwner
    whenNotPaused
  {
    require(_key != bytes32(0) && registeredKey[_key] == address(0));
    require(_addr != address(0) && registeredAddress[_addr] == false);

    registeredAddress[_addr] = true;
    registeredKey[_key] = _addr;
    registeredAmount[_addr] = _amount;

    RegisteredWithKeyAndPreSale(_key, _addr, _amount);
  }

  function unregisterUser(
    address _addr)
    public
    onlyOwner
    onlyRegistered(_addr)
  {
    registeredAddress[_addr] = false;
    registeredAmount[_addr] = 0;

    Unregistered(_addr);
  }

  function unregisterUserWithKey(
    bytes32 _key,
    address _addr)
    public
    onlyOwner
    onlyRegisteredWithKey(_key, _addr)
  {
    registeredKey[_key] = address(0);
    registeredAddress[_addr] = false;
    registeredAmount[_addr] = 0;

    UnregisteredWithKey(_key, _addr);
  }

}
