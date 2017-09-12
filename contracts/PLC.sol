pragma solidity ^0.4.13;

import './token/MintableToken.sol';
import './token/PausableToken.sol';
import './token/VestedToken.sol';
import './token/BurnableToken.sol';

/**
 * @title PLC
 * @dev PLC is ERC20 token contract, inheriting MintableToken, PausableToken,
 * VestedToken, BurnableToken contract from open zeppelin.
 */
contract PLC is MintableToken, PausableToken, VestedToken, BurnableToken {
  string public name = "PlusCoin";
  string public symbol = "PLC";
  uint256 public decimals = 18;
}
