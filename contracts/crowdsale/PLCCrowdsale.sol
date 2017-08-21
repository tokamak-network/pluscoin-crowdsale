pragma solidity ^0.4.11;

import '../math/SafeMath.sol';
import '../ownership/Ownable.sol';
import '../token/PLC.sol';
import './RefundVault.sol';

/**
 * @title PLCCrowdsale
 * @dev PLCCrowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract PLCCrowdsale is Ownable, SafeMath{

  // The token being sold
  PLC public token;

  // start and end timestamps where investments are allowed (both inclusive)



  //startTime for test
  uint64 public startTime = 1500000000; //2017.9.26 12:00 am (UTC)
  //uint64 public startTime = 1506384000; //2017.9.26 12:00 am (UTC)
  uint64 public endTime = 1507593600; //2017.10.10 12:00 am (UTC)

  uint64[5] public deadlines = [1506643200, 1506902400, 1507161600, 1507420800, 1507593600]; // [2017.9.26, 2017.10.02, 2017.10.05, 2017.10.08, 2017.10.10]
	uint8[5] public rates = [240, 230, 220, 210, 200];

  // amount of raised money in wei
  uint256 public weiRaised;

  // amount of ether buyer can buy
  uint256 constant public maxGuaranteedLimit = 5000 ether;

  // amount of ether funded for each buyer
  mapping (address => uint256) public buyerFunded;

  // buyable interval in block number 20
  uint256 constant public maxCallFrequency = 20;

  // block number when buyer buy
  mapping (address => uint256) public lastCallBlock;

  modifier canBuyInBlock (uint256 blockInterval) {
    require(add(lastCallBlock[msg.sender], blockInterval) < block.number);
    lastCallBlock[msg.sender] = block.number;
    _;
  }

  bool public isFinalized = false;

  // minimum amount of funds to be raised in weis
  uint256 public maxEtherCap = 100000 ether;
  uint256 public minEtherCap = 30000 ether;

  // refund vault used to hold funds while crowdsale is running
  RefundVault public vault;

  address devMultisig = 0x01;
  address[5] reserveWallet = [0x11,0x22,0x33,0x44,0x55];

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  event Finalized();

  function PLCCrowdsale() {
    /*require(startTime >= now);*/

    token = createTokenContract();
    vault = new RefundVault();
  }


  // creates the token to be sold.
  function createTokenContract() internal returns (PLC) {
    return new PLC();
  }


  // fallback function can be used to buy tokens
  function () payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) payable canBuyInBlock(maxCallFrequency) {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    uint256 totalAmount = add(buyerFunded[msg.sender], weiAmount);

    uint256 toFund;
    if (totalAmount > maxGuaranteedLimit) {
      toFund = sub(totalAmount, maxGuaranteedLimit);
    } else {
      toFund = weiAmount;
    }

    if(add(weiRaised,toFund) > maxEtherCap) {
      toFund = sub(maxEtherCap,weiRaised);
    }

    require(weiAmount>=toFund);

    // calculate token amount to be created
    uint256 tokens = mul(toFund,getRate());

    if (toFund > 0) {
      // update state
      weiRaised = add(weiRaised,toFund);
      buyerFunded[msg.sender] = add(buyerFunded[msg.sender], toFund);

      token.mint(beneficiary, tokens);
      TokenPurchase(msg.sender, beneficiary, toFund, tokens);

      forwardFunds();
    }

    uint256 toReturn = sub(weiAmount, toFund);

    if (toReturn > 0) {
      msg.sender.transfer(toReturn);
    }
  }

  function getRate() constant returns (uint256 rate){
        for(uint8 i = 0; i < deadlines.length; i++)
            if(now<deadlines[i])
                return rates[i];
        return rates[rates.length-1];//should never be returned, but to be sure to not divide by 0
    }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    vault.deposit.value(msg.value)(msg.sender);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase && !maxReached();
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return now > endTime;
  }

  // should be called after crowdsale ends, to do
  // some extra finalization work
  function finalize() onlyOwner {
    require(!isFinalized);
    require(hasEnded()||maxReached());

    finalization();
    Finalized();

    isFinalized = true;
  }

  // end token minting on finalization
  // override this with custom logic if needed
  function finalization() internal {
    if (minReached()) {
      vault.close();

      uint256 totalToken = token.totalSupply();

      //dev team 10%
      uint256 devAmount = div(mul(totalToken,10),80);
      token.mint(address(this), devAmount);
      token.grantVestedTokens(devMultisig, devAmount, uint64(now), uint64(now + 1 years), uint64(now + 1 years),false,false);

      //reserve 10%
      for(uint8 i=0;i<5;i++){
        token.mint(reserveWallet[i], div(mul(totalToken,2),80));
      }

    } else {
      vault.enableRefunds();
    }

    token.finishMinting();
  }

  // if crowdsale is unsuccessful, investors can claim refunds here
  function claimRefund() {
    require(isFinalized);
    require(!minReached());

    vault.refund(msg.sender);
  }

  function maxReached() public constant returns (bool) {
    return weiRaised == maxEtherCap;
  }

  function minReached() public constant returns (bool) {
    return weiRaised >= minEtherCap;
  }


}
