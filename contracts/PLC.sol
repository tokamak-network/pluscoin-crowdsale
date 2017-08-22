pragma solidity ^0.4.11;

import './token/MintableToken.sol';
import './token/PausableToken.sol';
import './token/VestedToken.sol';

contract PLC is MintableToken, PausableToken, VestedToken{
  string public name = "Plus Coin";
  string public symbol = "PLC";
  uint256 public decimals = 18;
}
