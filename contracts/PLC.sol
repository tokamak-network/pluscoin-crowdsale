pragma solidity ^0.4.13;

import './token/MintableToken.sol';
import './token/PausableToken.sol';
import './token/VestedToken.sol';
import './token/BurnableToken.sol';

contract PLC is MintableToken, PausableToken, VestedToken, BurnableToken {
  string public name = "PlusCoin";
  string public symbol = "PLC";
  uint256 public decimals = 18;
}
