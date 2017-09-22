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
  // bool: true if deferred otherwise false
  mapping (bool => mapping (address => uint256)) public buyerFunded;

  // amount of tokens minted for deferredBuyers
  uint256 public deferredTotalTokens;


  // buyable interval in block number 20
  uint256 constant public maxCallFrequency = 20;

  // block number when buyer buy
  mapping (address => uint256) public lastCallBlock;

  bool public isFinalized = false;

  // minimum amount of funds to be raised in weis
  uint256 public maxEtherCap; // 100000 ether;
  uint256 public minEtherCap; // 30000 ether;

  // investor address list
  address[] buyerList;
  mapping (address => bool) inBuyerList;

  // number of refunded investors
  uint256 refundCompleted;

  // new owner of token contract when crowdsale is Finalized
  address newTokenOwner = 0x2c14c48e09913dd49d04145458c38c2b5e151fec;

  // refund vault used to hold funds while crowdsale is running
  RefundVault public vault;

  // dev team multisig wallet
  address devMultisig;

  // reserve
  address[] reserveWallet;

  /**
   * @dev Checks whether buyer is sending transaction too frequently
   */
  modifier canBuyInBlock () {
    require(add(lastCallBlock[msg.sender], maxCallFrequency) < block.number);
    lastCallBlock[msg.sender] = block.number;
    _;
  }

  /**
   * @dev Checks whether ico is started
   */
  modifier onlyAfterStart() {
    require(now >= startTime && now <= endTime);
    _;
  }

  /**
   * @dev Checks whether ico is not started
   */
  modifier onlyBeforeStart() {
    require(now < startTime);
    _;
  }

  /**
   * @dev Checks whether the account is registered
   */
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
   * @param _presaleRate rate at which presaleInvestor can buy tokens
   * @param _isDeferred whether the investor is deferred investor
   */
  event RegisterPresale(address indexed presaleInvestor, uint256 presaleAmount, uint256 _presaleRate, bool _isDeferred);

  /**
   * event for unregister presale logging
   * @param presaleInvestor who register for presale
   */
  event UnregisterPresale(address indexed presaleInvestor);

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
    address[] _reserveWallet,
    uint64[6] _timelines, // [startTime, ... , endTime]
    uint256 _maxEtherCap,
    uint256 _minEtherCap)
  {
    //timelines check
    for(uint8 i = 0; i < _timelines.length-1; i++){
      require(_timelines[i] < _timelines[i+1]);
    }
    require(_timelines[0] >= now);

    //address check
    require(_kyc != 0x00 && _token != 0x00 && _refundVault != 0x00 && _devMultisig != 0x00);
    for(i = 0; i < _reserveWallet.length; i++){
      require(_reserveWallet[i] != 0x00);
    }

    //cap check
    require(_minEtherCap < _maxEtherCap);

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

  /**
   * @dev PLCCrowdsale fallback function for buying Tokens
   */
  function () payable {
    if(isDeferred[msg.sender])
      buyDeferredPresaleTokens(msg.sender);
    else if(now < startTime)
      buyPresaleTokens(msg.sender);
    else
      buyTokens();
  }

  /**
   * @dev push all token buyers in list
   * @param _addr address Account to push into buyerList
   */
  function pushBuyerList(address _addr) internal {
    if (!inBuyerList[_addr]) {
      inBuyerList[_addr] = true;
      buyerList.push(_addr);
    }
  }

  /**
   * @dev register presale account checking modifier
   * @param presaleInvestor address The account to register as presale account
   * @param presaleAmount uint256 The value which investor is allowed to buy
   * @param _presaleRate uint256 The rate at which investor buy tokens
   * @param _isDeferred bool whether presaleInvestor is deferred buyer
   */
  function registerPresale(address presaleInvestor, uint256 presaleAmount, uint256 _presaleRate, bool _isDeferred)
    onlyBeforeStart
    onlyOwner
  {
    require(presaleInvestor != 0x00);
    require(presaleAmount > 0);
    require(_presaleRate > 0);
    require(presaleGuaranteedLimit[presaleInvestor] == 0);

    presaleGuaranteedLimit[presaleInvestor] = presaleAmount;
    presaleRate[presaleInvestor] = _presaleRate;
    isDeferred[presaleInvestor] = _isDeferred;

    if(_isDeferred) {
      weiRaised = add(weiRaised, presaleAmount);

      uint256 deferredInvestorToken = mul(presaleAmount, _presaleRate);
      uint256 deferredDevToken = div(mul(deferredInvestorToken, 20), 70);
      uint256 deferredReserveToken = div(mul(deferredInvestorToken, 10), 70);

      uint256 totalAmount = add(deferredInvestorToken, add(deferredDevToken, deferredReserveToken));
      token.mint(address(this), totalAmount);

      deferredTotalTokens = add(deferredTotalTokens, totalAmount);
    }

    RegisterPresale(presaleInvestor, presaleAmount, _presaleRate, _isDeferred);
  }

  /**
   * @dev register presale account checking modifier
   * @param presaleInvestor address The account to register as presale account
   */
  function unregisterPresale(address presaleInvestor)
    onlyBeforeStart
    onlyOwner
  {
    require(presaleInvestor != 0x00);
    require(presaleGuaranteedLimit[presaleInvestor] > 0);

    uint256 _amount = presaleGuaranteedLimit[presaleInvestor];
    uint256 _rate = presaleRate[presaleInvestor];
    bool _isDeferred = isDeferred[presaleInvestor];

    require(buyerFunded[_isDeferred][presaleInvestor] == 0);

    presaleGuaranteedLimit[presaleInvestor] = 0;
    presaleRate[presaleInvestor] = 0;
    isDeferred[presaleInvestor] = false;

    if(_isDeferred) {
      weiRaised = sub(weiRaised, _amount);

      uint256 deferredInvestorToken = mul(_amount, _rate);
      uint256 deferredDevToken = div(mul(deferredInvestorToken, 20), 70);
      uint256 deferredReserveToken = div(mul(deferredInvestorToken, 10), 70);

      uint256 totalAmount = add(deferredInvestorToken, add(deferredDevToken, deferredReserveToken));
      deferredTotalTokens = sub(deferredTotalTokens, totalAmount);
      token.burn(totalAmount);
    }

    UnregisterPresale(presaleInvestor);
  }

  /**
   * @dev buy token (deferred presale investor)
   * @param beneficiary address The account to receive tokens
   */
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
    uint256 totalAmount = add(buyerFunded[true][beneficiary], weiAmount);

    uint256 toFund;
    if (totalAmount > guaranteedLimit) {
      toFund = sub(guaranteedLimit, buyerFunded[true][beneficiary]);
    } else {
      toFund = weiAmount;
    }

    require(toFund > 0);
    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, presaleRate[beneficiary]);
    uint256 toReturn = sub(weiAmount, toFund);

    buy(beneficiary, tokens, toFund, toReturn, true);

    // token distribution : 70% for sale, 20% for dev, 10% for reserve
    uint256 devAmount = div(mul(tokens, 20), 70);
    uint256 reserveAmount = div(mul(tokens, 10), 70);

    distributeToken(devAmount, reserveAmount, true);

    // ether distribution : 10% for dev, 90% for reserve
    uint256 devEtherAmount = div(toFund, 10);
    uint256 reserveEtherAmount = div(mul(toFund, 9), 10);

    distributeEther(devEtherAmount, reserveEtherAmount);

    DeferredPresaleTokenPurchase(msg.sender, beneficiary, toFund, tokens);
  }

  /**
   * @dev buy token (normal presale investor)
   * @param beneficiary address The account to receive tokens
   */
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
    uint256 totalAmount = add(buyerFunded[false][beneficiary], weiAmount);

    uint256 toFund;
    if (totalAmount > guaranteedLimit) {
      toFund = sub(guaranteedLimit, buyerFunded[false][beneficiary]);
    } else {
      toFund = weiAmount;
    }

    require(toFund > 0);
    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, presaleRate[beneficiary]);
    uint256 toReturn = sub(weiAmount, toFund);

    buy(beneficiary, tokens, toFund, toReturn, false);
    forwardFunds(toFund);
    PresaleTokenPurchase(msg.sender, beneficiary, toFund, tokens);
  }

  /**
   * @dev buy token (normal investors)
   */
  function buyTokens()
    payable
    whenNotPaused
    canBuyInBlock
    onlyAfterStart
    onlyRegistered(msg.sender)
  {

    // check validity
    require(validPurchase());
    require(buyerFunded[false][msg.sender] < maxGuaranteedLimit);

    // calculate eth amount
    uint256 weiAmount = msg.value;
    uint256 totalAmount = add(buyerFunded[false][msg.sender], weiAmount);

    uint256 toFund;
    if (totalAmount > maxGuaranteedLimit) {
      toFund = sub(maxGuaranteedLimit, buyerFunded[false][msg.sender]);
    } else {
      toFund = weiAmount;
    }

    if(add(weiRaised,toFund) > maxEtherCap) {
      toFund = sub(maxEtherCap, weiRaised);
    }

    require(toFund > 0);
    require(weiAmount >= toFund);

    uint256 tokens = mul(toFund, getRate());
    uint256 toReturn = sub(weiAmount, toFund);

    buy(msg.sender, tokens, toFund, toReturn, false);
    forwardFunds(toFund);
    TokenPurchase(msg.sender, msg.sender, toFund, tokens);
  }

  /**
   * @dev get buy rate for now
   * @return rate uint256 rate for now
   */
  function getRate() constant returns (uint256 rate) {
    for(uint8 i = 0; i < deadlines.length; i++)
      if(now < deadlines[i])
        return rates[i];
      return rates[rates.length-1];//should never be returned, but to be sure to not divide by 0
  }

  /**
   * @dev get the number of buyers
   * @return uint256 the number of buyers
   */
  function getBuyerNumber() constant returns (uint256) {
    return buyerList.length;
  }

  /**
   * @dev send ether to the fund collection wallet
   * @param toFund uint256 The value of weis to send to vault
   */
  function forwardFunds(uint256 toFund) internal {
    vault.deposit.value(toFund)(msg.sender);
  }

  /**
   * @dev checks whether purchase value is not zero and maxEtherCap is not reached
   * @return true if the transaction can buy tokens
   */
  function validPurchase() internal constant returns (bool) {
    bool nonZeroPurchase = msg.value != 0;
    return nonZeroPurchase && !maxReached();
  }

  function buy(
    address _beneficiary,
    uint256 _tokens,
    uint256 _toFund,
    uint256 _toReturn,
    bool _isDeferred)
    internal
  {
    if (!_isDeferred) {
      pushBuyerList(msg.sender);
      weiRaised = add(weiRaised, _toFund);
    }

    buyerFunded[_isDeferred][_beneficiary] = add(buyerFunded[_isDeferred][_beneficiary], _toFund);

    if (!_isDeferred) {
      token.mint(address(this), _tokens);
    }

    // 1 week lock
    token.grantVestedTokens(
      _beneficiary,
      _tokens,
      uint64(endTime),
      uint64(endTime + 1 weeks),
      uint64(endTime + 1 weeks),
      false,
      false);

    // return ether if needed
    if (_toReturn > 0) {
      msg.sender.transfer(_toReturn);
    }
  }

  /**
   * @dev distribute token to multisig wallet and reserve walletes.
   * This function is called in two context where crowdsale is closing and
   * deferred token is bought.
   * @param devAmount uint256 token amount for dev multisig wallet
   * @param reserveAmount uint256 token amount for reserve walletes
   * @param _isDeferred bool check whether function is called when deferred token is sold
   */
  function distributeToken(uint256 devAmount, uint256 reserveAmount, bool _isDeferred) internal {
    uint256 eachReserveAmount = div(reserveAmount, reserveWallet.length);

    token.grantVestedTokens(
      devMultisig,
      devAmount,
      uint64(endTime),
      uint64(endTime),
      uint64(endTime + 1 years),
      false,
      false);

    if (_isDeferred) {
      for(uint8 i = 0; i < reserveWallet.length; i++) {
        token.transfer(reserveWallet[i], eachReserveAmount);
      }
    } else {
      for(uint8 j = 0; j < reserveWallet.length; j++) {
        token.mint(reserveWallet[j], eachReserveAmount);
      }
    }
  }

  /**
   * @dev distribute ether to multisig wallet and reserve walletes
   * @param devAmount uint256 ether amount for dev multisig wallet
   * @param reserveAmount uint256 ether amount for reserve walletes
   */
  function distributeEther(uint256 devAmount, uint256 reserveAmount) internal {
    uint256 eachReserveAmount = div(reserveAmount, reserveWallet.length);

    devMultisig.transfer(devAmount);

    for(uint8 i = 0; i < reserveWallet.length; i++){
      reserveWallet[i].transfer(eachReserveAmount);
    }
  }

  /**
   * @dev checks whether crowdsale is ended
   * @return true if crowdsale event has ended
   */
  function hasEnded() public constant returns (bool) {
    return now > endTime;
  }

  /**
   * @dev should be called after crowdsale ends, to do
   */
  function finalize() {
    require(!isFinalized);
    require(hasEnded() || maxReached());

    finalization();
    Finalized();

    isFinalized = true;
  }

  /**
   * @dev end token minting on finalization, mint tokens for dev team and reserve wallets
   */
  function finalization() internal {
    if (minReached()) {
      vault.close();

      uint256 totalToken = token.totalSupply();
      uint256 tokenSold = sub(totalToken, deferredTotalTokens);

      // token distribution : 70% for sale, 20% for dev, 10% for reserve
      uint256 devAmount = div(mul(tokenSold, 20), 70);
      uint256 reserveAmount = div(mul(tokenSold, 10), 70);

      token.mint(address(this), devAmount);

      distributeToken(devAmount, reserveAmount, false);
    } else {
      vault.enableRefunds();
    }
    token.finishMinting();
    token.transferOwnership(newTokenOwner);
  }

  /**
   * @dev should be called when ethereum is forked during crowdsale for refunding ethers on not supported fork
   */
  function finalizeWhenForked() onlyOwner whenPaused {
    require(!isFinalized);
    isFinalized = true;

    vault.enableRefunds();
    token.finishMinting();
  }

  /**
   * @dev refund a lot of investors at a time checking onlyOwner
   * @param numToRefund uint256 The number of investors to refund
   */
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

  /**
   * @dev if crowdsale is unsuccessful, investors can claim refunds here
   * @param investor address The account to be refunded
   */
  function claimRefund(address investor) returns (bool) {
    require(isFinalized);
    require(!minReached());

    return vault.refund(investor);
  }

  /**
   * @dev Checks whether maxEtherCap is reached
   * @return true if max ether cap is reaced
   */
  function maxReached() public constant returns (bool) {
    return weiRaised == maxEtherCap;
  }

  /**
   * @dev Checks whether minEtherCap is reached
   * @return true if min ether cap is reaced
   */
  function minReached() public constant returns (bool) {
    return weiRaised >= minEtherCap;
  }

  /**
   * @dev should burn unpaid tokens of deferred presale investors
   */
  function burnUnpaidTokens()
    onlyOwner
  {
    require(isFinalized);

    uint256 unpaidTokens = token.balanceOf(address(this));

    token.burn(unpaidTokens);
  }
}
