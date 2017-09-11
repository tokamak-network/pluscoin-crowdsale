pragma solidity ^0.4.13;

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
contract PLCCrowdsale is Ownable, SafeMath, Pausable {

  // token registery contract
  KYC public kyc;

  // The token being sold
  PLC public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint64 public startTime; // 1506384000; //2017.9.26 12:00 am (UTC)
  uint64 public endTime; // 1507593600; //2017.10.10 12:00 am (UTC)

  uint64[5] public deadlines; // [1506643200, 1506902400, 1507161600, 1507420800, 1507593600]; // [2017.9.26, 2017.10.02, 2017.10.05, 2017.10.08, 2017.10.10]

  mapping (address => uint256) public presaleRate;
	uint8[5] public rates = [240, 230, 220, 210, 200];

  // amount of raised money in wei
  uint256 public weiRaised;

  // amount of ether buyer can buy
  uint256 constant public maxGuaranteedLimit = 5000 ether;

  // amount of ether presale buyer can buy
  mapping (address => uint256) public presaleGuaranteedLimit;

  mapping (address => bool) public isDeferred;

  // amount of ether funded for each buyer
  mapping (address => uint256) public buyerFunded;
  mapping (address => uint256) public buyerDeferredSaleFunded;


  // buyable interval in block number 20
  uint256 constant public maxCallFrequency = 20;

  // block number when buyer buy
  mapping (address => uint256) public lastCallBlock;

  bool public isFinalized = false;

  // minimum amount of funds to be raised in weis
  uint256 public maxEtherCap; // 100000 ether;
  uint256 public minEtherCap; // 30000 ether;

  //investor address list
  address[] buyerList;

  //number of refunded investors
  uint256 refundCompleted;

  //new owner of token contract when crowdsale is Finalized
  address newTokenOwner = 0x01ad78dbd65579882a7058bc19b104103627a2ff; // TODO: real acount

  // refund vault used to hold funds while crowdsale is running
  RefundVault public vault;

  //dev team multisig wallet
  address devMultisig;

  //reserve
  address[5] reserveWallet;

  /**
   * @dev Checks whether buyer is sending transaction too frequently or not
   */
  modifier canBuyInBlock () {
    require(add(lastCallBlock[msg.sender], maxCallFrequency) < block.number);
    lastCallBlock[msg.sender] = block.number;
    _;
  }

  modifier onlyAfterStart(){
    require(now >= startTime && now <= endTime);
    _;
  }

  modifier onlyBeforeStart(){
    require(now < startTime);
    _;
  }

  modifier onlyRegistered(address _addr) {
    require(kyc.isRegistered(_addr));
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
  event PresaleTokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  event DeferredPresaleTokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  /**
   * event for finalize logging
   */
  event Finalized();

  /**
   * event for register presale logging
   * @param presaleInvestor who register for presale
   * @param presaleAmount weis presaleInvestor can buy as presale
   * @param presaleRate rate at which presaleInvestor can buy tokens
   */
  event RegisterPresale(address indexed presaleInvestor, uint256 presaleAmount, uint256 presaleRate);

  /**
   * @dev PLCCrowdsale constructor sets variables
   * @param _kyc address The address which KYC contract is deployed at
   * @param _token address The address which PLC contract is deployed at
   * @param _refundVault address The address which RefundVault is deployed at
   * @param _devMultisig address The address which MultiSigWallet for devTeam is deployed at
   * @param _reserveWallet address[5] The address list of reserveWallet addresses
   * @param _timelines uint64[5] list of timelines from startTime to endTime with timelines for rate changes
   * @param _maxEtherCap uint256 The value which maximum weis to be funded
   * @param _minEtherCap uint256 The value which minimum weis to be funded
   */
  function PLCCrowdsale(
    address _kyc,
    address _token,
    address _refundVault,
    address _devMultisig,
    address[5] _reserveWallet,
    uint64[6] _timelines, // [startTime, ... , endTime]
    uint256 _maxEtherCap,
    uint256 _minEtherCap)
  {

    // require(_timelines[0] >= now);

    kyc   = KYC(_kyc);
    token = PLC(_token);
    vault = RefundVault(_refundVault);

    devMultisig   = _devMultisig;
    reserveWallet = _reserveWallet;

    startTime    = _timelines[0];
    endTime      = _timelines[5];

    deadlines[0] = _timelines[1];
    deadlines[1] = _timelines[2];
    deadlines[2] = _timelines[3];
    deadlines[3] = _timelines[4];
    deadlines[4] = _timelines[5];

    maxEtherCap  = _maxEtherCap;
    minEtherCap  = _minEtherCap;

  }

  // fallback function can be used to buy tokens
  function () payable {
    if(isDeferred[msg.sender]){
      buyDeferredPresaleTokens(msg.sender);
    }
    else if(now < startTime)
      buyPresaleTokens(msg.sender);
    else
      buyTokens();
  }

  function pushBuyerList(address _address) internal {
		if (buyerFunded[_address] > 0 || buyerDeferredSaleFunded[_address] > 0) {
			buyerList.push(_address);
		}
	}


  function registerPresale(address presaleInvestor, uint256 presaleAmount, uint256 _presaleRate, bool _isDeferred) onlyBeforeStart {
    require(presaleInvestor != 0x00);
    require(presaleAmount > 0);
    require(_presaleRate > 0);

    presaleGuaranteedLimit[presaleInvestor] = presaleAmount;
    presaleRate[presaleInvestor] = _presaleRate;
    isDeferred[presaleInvestor] = _isDeferred;

    if(_isDeferred){
      weiRaised = add(weiRaised, presaleAmount);

      uint256 tokens = mul(presaleAmount, _presaleRate);
      token.mint(address(this), tokens);
    }

    RegisterPresale(presaleInvestor, presaleAmount, _presaleRate);
  }

  function buyDeferredPresaleTokens(address beneficiary)
    payable
    whenNotPaused
  {
    require(beneficiary != 0x00);
    require(isDeferred[beneficiary]);

    uint guaranteedLimit = presaleGuaranteedLimit[beneficiary];
    require(guaranteedLimit > 0);

    uint256 weiAmount = msg.value;
    require(weiAmount != 0);
    uint256 totalAmount = add(buyerDeferredSaleFunded[beneficiary], weiAmount);

    uint256 toFund;
    if (totalAmount > guaranteedLimit) {
      toFund = sub(guaranteedLimit, buyerDeferredSaleFunded[beneficiary]);
    } else {
      toFund = weiAmount;
    }

    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, presaleRate[beneficiary]);

    // forward ether to vault
    if (toFund > 0) {
      // update state
      buyerDeferredSaleFunded[beneficiary] = add(buyerDeferredSaleFunded[beneficiary], toFund);
      pushBuyerList(beneficiary);

      token.transfer(beneficiary, tokens);
      DeferredPresaleTokenPurchase(msg.sender, beneficiary, toFund, tokens);

      //ether distribution straight to devMultisig & reserveWallet
      uint256 devAmount = div(toFund, 10);
      devMultisig.transfer(devAmount);

      uint reserveAmount = div(mul(toFund, 9), 10);
      for(uint8 i = 0; i < 5; i++){
        reserveWallet[i].transfer(div(reserveAmount, 5));
      }
    }

    uint256 toReturn = sub(weiAmount, toFund);
    // return ether if needed
    if (toReturn > 0) {
      msg.sender.transfer(toReturn);
    }

  }

  function buyPresaleTokens(address beneficiary)
    payable
    whenNotPaused
    onlyBeforeStart
  {
    // check validity
    require(beneficiary != 0x00);
    require(validPurchase());
    require(!isDeferred[beneficiary]);
    uint guaranteedLimit = presaleGuaranteedLimit[beneficiary];
    require(guaranteedLimit > 0);

    // calculate eth amount
    uint256 weiAmount = msg.value;
    uint256 totalAmount = add(buyerFunded[beneficiary], weiAmount);

    uint256 toFund;
    if (totalAmount > guaranteedLimit) {
      toFund = sub(guaranteedLimit, buyerFunded[beneficiary]);
    } else {
      toFund = weiAmount;
    }

    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, presaleRate[beneficiary]);

    // forward ether to vault
    if (toFund > 0) {
      // update state
      weiRaised = add(weiRaised, toFund);
      buyerFunded[beneficiary] = add(buyerFunded[beneficiary], toFund);
      pushBuyerList(beneficiary);

      // 1 week lock
      token.mint(address(this), tokens);
      token.grantVestedTokens(
        beneficiary,
        tokens,
        uint64(endTime),
        uint64(endTime + 1 weeks),
        uint64(endTime + 1 weeks),
        false,
        false);

      PresaleTokenPurchase(msg.sender, beneficiary, toFund, tokens);

      forwardFunds(toFund);
    }

    uint256 toReturn = sub(weiAmount, toFund);

    // return ether if needed
    if (toReturn > 0) {
      msg.sender.transfer(toReturn);
    }

  }

  // low level token purchase function
  function buyTokens()
    payable
    whenNotPaused
    canBuyInBlock
    onlyAfterStart
    onlyRegistered(msg.sender)
  {

    // check validity
    require(validPurchase());
    require(buyerFunded[msg.sender] < maxGuaranteedLimit);

    // calculate eth amount
    uint256 weiAmount = msg.value;
    uint256 totalAmount = add(buyerFunded[msg.sender], weiAmount);

    uint256 toFund;
    if (totalAmount > maxGuaranteedLimit) {
      toFund = sub(maxGuaranteedLimit, buyerFunded[msg.sender]);
    } else {
      toFund = weiAmount;
    }

    if(add(weiRaised,toFund) > maxEtherCap) {
      toFund = sub(maxEtherCap, weiRaised);
    }

    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, getRate());

    // forward ether to vault
    if (toFund > 0) {
      // update state
      weiRaised = add(weiRaised, toFund);
      buyerFunded[msg.sender] = add(buyerFunded[msg.sender], toFund);
      pushBuyerList(msg.sender);

      // 1 week lock
      token.mint(address(this), tokens);
      token.grantVestedTokens(
        msg.sender,
        tokens,
        uint64(endTime),
        uint64(endTime + 1 weeks),
        uint64(endTime + 1 weeks),
        false,
        false);

      TokenPurchase(msg.sender, msg.sender, toFund, tokens);

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
    bool nonZeroPurchase = msg.value != 0;
    return nonZeroPurchase && !maxReached();
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return now > endTime;
  }

  // should be called after crowdsale ends, to do
  // some extra finalization work
  function finalize() {
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
      uint256 devAmount = div(mul(totalToken, 20), 70);
      token.mint(address(this), devAmount);
      token.grantVestedTokens(
        devMultisig,
        devAmount,
        uint64(now),
        uint64(now),
        uint64(now + 1 years),
        false,
        false);

      // reserve 10%
      for(uint8 i = 0; i < 5; i++){
        token.mint(reserveWallet[i], div(mul(totalToken,2),70));
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

  function refundAll(uint256 numToRefund) onlyOwner {
    require(isFinalized);
    require(!minReached());
    require(numToRefund > 0);

		uint256 limit = refundCompleted + numToRefund;

    if (limit > buyerList.length) {
      limit = buyerList.length;
    }

    for(uint256 i = refundCompleted; i < limit; i++) {
      vault.refund(buyerList[i]);
    }

    refundCompleted = limit;
  }

  // if crowdsale is unsuccessful, investors can claim refunds here
  function claimRefund(address investor) returns (bool) {
    require(isFinalized);
    require(!minReached());

    return vault.refund(investor);
  }

  function maxReached() public constant returns (bool) {
    return weiRaised == maxEtherCap;
  }

  function minReached() public constant returns (bool) {
    return weiRaised >= minEtherCap;
  }

  function changeTokenOwner() onlyOwner {
    token.transferOwnership(newTokenOwner);
  }

  function burnUnpaidTokens()
    onlyOwner
  {
    require(isFinalized);

    uint256 unpaidTokens = token.balanceOf(address(this));

    token.burn(unpaidTokens);
  }

}
