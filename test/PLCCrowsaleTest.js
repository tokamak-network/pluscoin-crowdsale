import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMThrow from './helpers/EVMThrow'

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const PLCCrowdsale = artifacts.require('crowdsale/PLCCrowdsale.sol');
const PLC = artifacts.require('token/PLC.sol');

contract('PLCCrowdsale', function ([owner, wallet, investor]) {

  const GOAL = ether(10);

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  beforeEach(async function () {
    this.startTime = latestTime().unix() + duration.weeks(1);
    this.endTime =   this.startTime + duration.weeks(2);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.crowdsale = await PLCCrowdsale.new();
    this.token = PLC.at(await this.crowdsale.token());
  });

  it('should not accept payments before start', async function () {
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await this.crowdsale.buyTokens(investor, {from: investor, value: ether(1)}).should.be.rejectedWith(EVMThrow);
  });

  it('should accept payments during the sale', async function () {

    const investmentAmount = ether(1);

    await increaseTimeTo(this.startTime);
    var rate = await this.crowdsale.getRate();
    const expectedTokenAmount = rate.mul(investmentAmount);

    await this.crowdsale.buyTokens(investor, {value: investmentAmount, from: investor}).should.be.fulfilled;

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
    (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
  });

  it('should reject payments after end', async function () {
    await increaseTimeTo(this.afterEnd);
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await this.crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejectedWith(EVMThrow);
  });

  // it('should reject payments over cap', async function () {
  //   await increaseTimeTo(this.startTime);
  //   await this.crowdsale.send(CAP);
  //   await this.crowdsale.send(1).should.be.rejectedWith(EVMThrow);
  // });

  // it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
  //   await increaseTimeTo(this.startTime);
  //   await this.crowdsale.send(GOAL);
  //
  //   const beforeFinalization = web3.eth.getBalance(wallet);
  //   await increaseTimeTo(this.afterEndTime);
  //   await this.crowdsale.finalize({from: owner});
  //   const afterFinalization = web3.eth.getBalance(wallet);
  //
  //   afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
  // });
  //
  // it('should allow refunds if the goal is not reached', async function () {
  //   const balanceBeforeInvestment = web3.eth.getBalance(investor);
  //
  //   await increaseTimeTo(this.startTime);
  //   await this.crowdsale.sendTransaction({value: ether(1), from: investor, gasPrice: 0});
  //   await increaseTimeTo(this.afterEndTime);
  //
  //   await this.crowdsale.finalize({from: owner});
  //   await this.crowdsale.claimRefund({from: investor, gasPrice: 0}).should.be.fulfilled;
  //
  //   const balanceAfterRefund = web3.eth.getBalance(investor);
  //   balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  // });

});
