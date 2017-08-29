pragma solidity ^0.4.11;

import './math/SafeMath.sol';
import './ownership/Ownable.sol';
import './PLC.sol';
import './crowdsale/RefundVault.sol';
import './lifecycle/Pausable.sol';
import './KYC.sol';

/**
 * @title PLCCrowdsale
 * @dev PLCCrowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract PLCCrowdsale is Ownable, SafeMath, Pausable, KYC {

  // The token being sold
  PLC public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint64 public startTime; // 1506384000; //2017.9.26 12:00 am (UTC)
  uint64 public endTime; // 1507593600; //2017.10.10 12:00 am (UTC)

  uint64[5] public deadlines; // [1506643200, 1506902400, 1507161600, 1507420800, 1507593600]; // [2017.9.26, 2017.10.02, 2017.10.05, 2017.10.08, 2017.10.10]

  uint256 presaleRate = 500;
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

  bool public isFinalized = false;

  // minimum amount of funds to be raised in weis
  uint256 public maxEtherCap; // 100000 ether;
  uint256 public minEtherCap; // 30000 ether;

  // refund vault used to hold funds while crowdsale is running
  RefundVault public vault;

  address devMultisig;

  address[5] reserveWallet;

  modifier canBuyInBlock () {
    require(add(lastCallBlock[msg.sender], maxCallFrequency) < block.number);
    lastCallBlock[msg.sender] = block.number;
    _;
  }

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  event Finalized();
  event ForTest();

  function PLCCrowdsale(
    address _token,
    address _refundVault,
    address _devMultisig,
    address[5] _reserveWallet,
    uint64[6] _timelines, // [startTime, ... , endTime]
    uint256 _maxEtherCap,
    uint256 _minEtherCap) {

    require(_timelines[0] >= now);

    token = PLC(_token);
    vault = RefundVault(_refundVault);
    devMultisig = _devMultisig;
    reserveWallet = _reserveWallet;

    startTime = _timelines[0];
    endTime = _timelines[5];

    deadlines[0] = _timelines[1];
    deadlines[1] = _timelines[2];
    deadlines[2] = _timelines[3];
    deadlines[3] = _timelines[4];
    deadlines[4] = _timelines[5];

    maxEtherCap = _maxEtherCap;
    minEtherCap = _minEtherCap;

    /*token = createTokenContract();
    vault = new RefundVault();*/
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
  function buyTokens(address beneficiary) payable whenNotPaused canBuyInBlock onlyRegistered(msg.sender) {
    uint256 guaranteedLimit = maxGuaranteedLimit + registeredAmount[msg.sender];

    // check validity
    require(beneficiary != 0x00);
    require(validPurchase());
    require(buyerFunded[msg.sender] < guaranteedLimit);

    // calculate eth amount
    uint256 weiAmount = msg.value;
    uint256 totalAmount = add(buyerFunded[msg.sender], weiAmount);

    uint256 toFund;
    if (totalAmount > guaranteedLimit) {
      toFund = sub(guaranteedLimit, buyerFunded[msg.sender]);
    } else {
      toFund = weiAmount;
    }

    if(add(weiRaised,toFund) > maxEtherCap) {
      toFund = sub(maxEtherCap, weiRaised);
    }

    // ether for presale
    uint256 forPreSale;
    if (buyerFunded[beneficiary] < registeredAmount[beneficiary]) {
      forPreSale = min256(toFund, sub(registeredAmount[beneficiary], buyerFunded[beneficiary]));
    }

    // ether for crowdsale
    uint256 margin = sub(toFund, forPreSale);

    require(weiAmount >= toFund);
    require(toFund == add(forPreSale, margin));

    uint256 tokens;
    if (margin > 0) {
      tokens = mul(margin, getRate());
    }

    if (forPreSale > 0) {
      tokens = add(tokens, mul(forPreSale, presaleRate));
    }

    require(tokens > 0);

    // forward ether to vault
    if (toFund > 0) {
      // update state
      weiRaised = add(weiRaised, toFund);
      buyerFunded[beneficiary] = add(buyerFunded[beneficiary], toFund);

      token.mint(beneficiary, tokens);

      TokenPurchase(msg.sender, beneficiary, toFund, tokens);

      forwardFunds(toFund);
    }

    uint256 toReturn = sub(weiAmount, toFund);

    // return ether if needed
    if (toReturn > 0) {
      msg.sender.transfer(toReturn);
    }
  }

  function getRate() constant returns (uint256 rate) {
        for(uint8 i = 0; i < deadlines.length; i++)
            if(now < deadlines[i])
                return rates[i];
        return rates[rates.length-1];//should never be returned, but to be sure to not divide by 0
    }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds(uint256 toFund) internal {
    vault.deposit.value(toFund)(msg.sender);
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
    require(hasEnded() || maxReached());

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

      // dev team 10%
      uint256 devAmount = div(mul(totalToken, 10), 80);
      token.mint(address(this), devAmount);
      token.grantVestedTokens(devMultisig, devAmount, uint64(now), uint64(now + 1 years), uint64(now + 1 years),false,false);

      // reserve 10%
      for(uint8 i = 0; i < 5; i++){
        token.mint(reserveWallet[i], div(mul(totalToken,2),80));
      }

    } else {
      vault.enableRefunds();
    }

    token.finishMinting();
  }

  function finalizeWhenForked() onlyOwner whenPaused {
    require(!isFinalized);

    vault.enableRefunds();
    token.finishMinting();

    isFinalized = true;
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

  function changeTokenOwner(address newOwner) onlyOwner {
    token.transferOwnership(newOwner);
  }

}
