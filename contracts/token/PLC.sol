pragma solidity ^0.4.11;

import './MintableToken.sol';
import './PausableToken.sol';
import './VestedToken.sol';

contract PLC is MintableToken, PausableToken, VestedToken{
  string public name = "Plus Coin";
  string public symbol = "PLC";
  uint256 public decimals = 18;
}
