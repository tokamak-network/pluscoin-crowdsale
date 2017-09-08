pragma solidity ^0.4.11;

import './StandardToken.sol';
import '../math/SafeMath.sol';

/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 */

contract BurnableToken is SafeMath, StandardToken {


    event Burn(address indexed burner, uint indexed value);

    /**
     * @dev Burns a specific amount of tokens.
     * @param _value The amount of token to be burned.
     */
    function burn(uint _value)
        public
    {
        require(_value > 0);

        address burner = msg.sender;
        balances[burner] = sub(balances[burner], _value);
        totalSupply = sub(totalSupply, _value);
        Burn(burner, _value);
    }
}
