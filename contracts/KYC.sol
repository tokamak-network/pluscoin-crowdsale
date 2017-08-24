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
  mapping (bytes32 => address) public knownKey;
  mapping (address => uint256) public knownPreSaledEtherAmount;

  event AddressAdded(bytes32 indexed _key, address indexed _addr);
  event AddressPreSaled(bytes32 indexed _key, address indexed _addr, uint256 _amount);

  function addUser(bytes32 _key, address _addr) public onlyOwner whenNotPaused {
    require(_key != bytes32(0) && knownKey[_key] == address(0));
    require(_addr != address(0) && knownAddress[_addr] == false);

    knownAddress[_addr] = true;
    knownKey[_key] = _addr;
    AddressAdded(_key, _addr);
  }

  function addUserWithPreSale(bytes32 _key, address _addr, uint256 _amount) public onlyOwner whenNotPaused {
    require(_key != bytes32(0) && knownKey[_key] == address(0));
    require(_addr != address(0) && knownAddress[_addr] == false);

    knownAddress[_addr] = true;
    knownKey[_key] = _addr;
    AddressAdded(_key, _addr);

    knownPreSaledEtherAmount[_addr] = _amount;
    AddressPreSaled(_key, _addr, _amount);
  }
}
