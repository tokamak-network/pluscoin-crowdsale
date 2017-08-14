pragma solidity ^0.4.11;

import './MintableToken.sol';
import './PausableToken.sol';
import './VestedToken.sol';

contract PLCToken is MintableToken, PausableToken, VestedToken{
  string public name = "PLCToken";
  string public symbol = "PLC";
  uint256 public decimals = 18;
}
