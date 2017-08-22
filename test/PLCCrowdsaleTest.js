import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import moment from "moment";

const BigNumber = web3.BigNumber;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
const PLC = artifacts.require("token/PLC.sol");

contract("PLCCrowdsale", ([ owner, wallet, investor, accounts ]) => {
  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.crowdsale = await PLCCrowdsale.new();
    this.token = PLC.at(await this.crowdsale.token());

    this.now = moment().unix();
    this.startTime = await this.crowdsale.startTime();
    this.endTime = await this.crowdsale.endTime();

    this.beforeStartTime = this.startTime - duration.hours(1);
    this.afterEndTime = this.endTime + duration.hours(1);
    this.onStartTime = this.startTime + duration.hours(1);

    this.deadlines = [ 1506643200, 1506902400, 1507161600, 1507420800, 1507593600 ];
    this.rates = [ 240, 230, 220, 210, 200 ];

    this.maxGuaranteedLimit = ether(5000);
    this.maxCallFrequency = 20;

    this.maxEtherCap = ether(100000);
    this.minEtherCap = ether(30000);

    this.devMultisig = "0x01";
    this.reserveWallet = [ "0x11", "0x22", "0x33", "0x44", "0x55" ];
    await advanceBlock();
  });

  it("should reject payments before start", async function () {
    await increaseTimeTo(this.beforeStartTime);

    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await this.crowdsale
      .buyTokens(investor, { from: investor, value: ether(1) })
      .should.be.rejectedWith(EVMThrow);
  });

  it("should accept payments during the sale", async function () {
    const investmentAmount = ether(1);

    await increaseTimeTo(this.startTime);
    const rate = await this.crowdsale.getRate();
    const expectedTokenAmount = rate.mul(investmentAmount);

    await this.crowdsale.buyTokens(investor, {
      value: investmentAmount,
      from: investor,
    }).should.be.fulfilled;

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
    (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);


  });

  it("should mint following rate for each stage", async function () {
    const investmentAmount = ether(1);

    for(var i=0;i<5;i++){
      await increaseTimeTo(this.deadlines[i]-100);
      const rate = await this.crowdsale.getRate();
      const expectedTokenAmount = rate.mul(investmentAmount);

      await this.crowdsale.buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      }).should.be.fulfilled;

      (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
    }

  });

  it("should reject payments after end", async function () {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await this.crowdsale
      .buyTokens(investor, { value: ether(1), from: investor })
      .should.be.rejectedWith(EVMThrow);
  });

  it("should reject payments over 5000 ether", async function () {
    const investmentAmount = ether(5000.1);

    await this.crowdsale
      .buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      })
      .should.be.rejectedWith(EVMThrow);
  });

  it("should reject frequent payments in 20 blocks", async function () {
    const investmentAmount = ether(10);

    await this.crowdsale.buyTokens(investor, {
      value: investmentAmount,
      from: investor,
    }).should.be.fulfilled;

    await this.crowdsale
      .buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      })
      .should.be.rejectedWith(EVMThrow);
  });

  it("should reject when maxEtherCap reached", async function () {

    await this.crowdsale.setWeiRaisedForTest(100000 * 10**18);
    const investmentAmount = ether(1);

    await this.crowdsale
      .buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      })
      .should.be.rejectedWith(EVMThrow);
  });

  //Working ...
  it("should accept toFund and return toReturn", async function () {

    await this.crowdsale.setWeiRaisedForTest((100000-100) * 10**18);
    const investmentAmount = ether(120);

    // await increaseTimeTo(this.deadlines[i]-100);

    const rate = await this.crowdsale.getRate();
    const expectedTokenAmount = rate.mul(investmentAmount);

    await this.crowdsale
      .buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      })
      .should.be.fulfilled;

    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
    (await this.token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
  });

});
