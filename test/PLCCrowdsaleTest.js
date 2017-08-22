import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import moment from "moment";

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const PLCCrowdsale = artifacts.require("crowdsale/PLCCrowdsale.sol");
const PLC = artifacts.require("token/PLC.sol");

contract(
  "PLCCrowdsale",
  async (
    [
      owner,
      devMultisig,
      investor,
      reserveWallet0,
      reserveWallet1,
      reserveWallet2,
      reserveWallet3,
      reserveWallet4,
      ...accounts
    ],
  ) => {
    let crowdsale,
      token;

    let now,
      startTime,
      endTime;
    let beforeStartTime,
      afterEndTime,
      afterStartTime;

    let deadlines,
      rates;

    let maxGuaranteedLimit,
      maxCallFrequency;
    let maxEtherCap,
      minEtherCap;

    let reserveWallet;

    before(async () => {
      crowdsale = await PLCCrowdsale.new();
      token = PLC.at(await crowdsale.token());

      now = moment().unix();

      startTime = await crowdsale.startTime();
      endTime = await crowdsale.endTime();

      startTime = moment.unix(startTime) / 1000;
      endTime = moment.unix(endTime) / 1000;

      beforeStartTime = startTime - duration.seconds(100);
      afterStartTime = startTime + duration.seconds(1);
      afterEndTime = endTime + duration.seconds(1);

      console.log(`
------------------------------

\t[TIME]
startTime:\t\t${ startTime }
endTime:\t\t${ endTime }

beforeStartTime:\t${ beforeStartTime }
afterStartTime:\t\t${ afterStartTime }
afterEndTime:\t\t${ afterEndTime }

now:\t\t\t${ now }

------------------------------
`);

      deadlines = [ 1506643200, 1506902400, 1507161600, 1507420800, 1507593600 ];
      rates = [ 240, 230, 220, 210, 200 ];

      maxGuaranteedLimit = ether(5000);
      maxCallFrequency = 20;

      maxEtherCap = ether(100000);
      minEtherCap = ether(30000);

      reserveWallet = [
        reserveWallet0,
        reserveWallet1,
        reserveWallet2,
        reserveWallet3,
        reserveWallet4,
      ];
    });

    beforeEach(async () => {
      crowdsale = await PLCCrowdsale.new();
      token = PLC.at(await crowdsale.token());

      // proceed 20 block
      for (const i of Array(20)) {
        await advanceBlock();
      }
    });

    // before start
    it("should reject payments before start", async () => {
      await increaseTimeTo(beforeStartTime);

      await crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
      await crowdsale
        .buyTokens(investor, { from: investor, value: ether(1) })
        .should.be.rejectedWith(EVMThrow);
    });

    // after start
    it("should accept payments during the sale", async () => {
      await increaseTimeTo(afterStartTime);

      const investmentAmount = ether(1);
      const rate = rates[ 0 ];
      const expectedTokenAmount = rate * investmentAmount;

      await crowdsale.buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      }).should.be.fulfilled;

      (await token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      (await token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
    });

    it("should reject payments over 5000 ether", async () => {
      const investmentAmount = ether(5001);

      const balanceBeforeInvest = await eth.getBalance(investor);

      const rate = await crowdsale.getRate();
      const expectedTokenAmount = rate * maxGuaranteedLimit;

      await crowdsale.buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      }).should.be.fulfilled;

      const balanceAfterInvest = await eth.getBalance(investor);

      // toReturn
      (balanceBeforeInvest - balanceAfterInvest).should.be.within(5000 * 10 ** 18, 5001 * 10 ** 18);

      // toFund
      (await token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      (await token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
    });

    it("should reject frequent payments in 20 blocks", async () => {
      const investmentAmount = ether(1);

      await crowdsale.buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      }).should.be.fulfilled;

      await crowdsale
        .buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        })
        .should.be.rejectedWith(EVMThrow);
    });

    it("should reject when maxEtherCap reached", async () => {
      // 20 accounts, total 100,000 ether
      await Promise.all(
        accounts.slice(0, 20).map(
          async account =>
            crowdsale.buyTokens(account, {
              value: ether(5000),
              from: account,
            }).should.be.fulfilled,
        ),
      );

      const investmentAmount = ether(1);

      await crowdsale
        .buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        })
        .should.be.rejectedWith(EVMThrow);
    });

    it("should accept toFund and return toReturn", async () => {
      await crowdsale.setWeiRaisedForTest(maxEtherCap - ether(100));
      const investmentAmount = ether(101);

      const balanceBeforeInvest = await eth.getBalance(investor);

      const rate = await crowdsale.getRate();
      const expectedTokenAmount = rate * ether(100);

      await crowdsale.buyTokens(investor, {
        value: investmentAmount,
        from: investor,
      }).should.be.fulfilled;

      const balanceAfterInvest = await eth.getBalance(investor);

      // toReturn
      (balanceBeforeInvest - balanceAfterInvest).should.be.bignumber.within(
        100 * 10 ** 18,
        101 * 10 ** 18,
      );

      // toFund
      (await token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
      (await token.totalSupply()).should.be.bignumber.equal(expectedTokenAmount);
    });

    it("can finalized during the sale", async () => {
      const investmentAmount = ether(5000);

      // 20 accounts, total 100,000 ether
      for (const account of accounts.slice(0, 20)) {
        await crowdsale.buyTokens(account, {
          value: investmentAmount,
          from: account,
        }).should.be.fulfilled;
      }

      (await crowdsale.weiRaised()).should.be.bignumber.equal(maxEtherCap);
      // (await web3.eth.getBalance(devMultisig)).should.be.bignumber.equal(maxEtherCap);
      await crowdsale.finalize().should.be.fulfilled;
    });

    // afterEndTime
    it("should reject payments after end", async () => {
      await increaseTimeTo(afterEndTime);
      await crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
      await crowdsale
        .buyTokens(investor, { value: ether(1), from: investor })
        .should.be.rejectedWith(EVMThrow);
    });

    it("should reject payments after finalized", async () => {
      await crowdsale.setWeiRaisedForTest(maxEtherCap);

      await crowdsale.finalize().should.be.fulfilled;
      await crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
      await crowdsale
        .buyTokens(investor, { value: ether(1), from: investor })
        .should.be.rejectedWith(EVMThrow);
    });
  },
);
