import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore } from "./helpers/snapshot";
import moment from "moment";

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const PLCCrowdsale = artifacts.require("PLCCrowdsale.sol");
const PLC = artifacts.require("PLC.sol");
const RefundVault = artifacts.require("crowdsale/RefundVault.sol");
const MultiSig = artifacts.require("wallet/MultiSigWallet.sol");
const KYC = artifacts.require("KYC.sol");

contract(
  "PLCCrowdsale",
  async (
    [
      owner,
      _,
      investor,
      reserveWallet0,
      reserveWallet1,
      reserveWallet2,
      reserveWallet3,
      reserveWallet4,
      ...accounts
    ],
  ) => {
    let snapshotId;

    let multiSig, crowdsale, token, vault, kyc;

    let now, startTime, endTime;
    let beforeStartTime, afterEndTime, afterStartTime;

    let timelines, presaleRate, rates;

    let maxGuaranteedLimit, maxCallFrequency;
    let maxEtherCap, minEtherCap, _maxEtherCap, _minEtherCap;

    let reserveWallet;

    before(async () => {
      reserveWallet = [
        reserveWallet0,
        reserveWallet1,
        reserveWallet2,
        reserveWallet3,
        reserveWallet4,
      ];

      timelines = [ 1506384000, 1506643200, 1506902400, 1507161600, 1507420800, 1507593600 ];
      presaleRate = 500;
      rates = [ 240, 230, 220, 210, 200 ];

      maxGuaranteedLimit = ether(5000);
      maxCallFrequency = 20;

      maxEtherCap = ether(100000);
      minEtherCap = ether(30000);

      // deploy contracts
      multiSig = await MultiSig.new(reserveWallet, reserveWallet.length - 1); // 4 out of 5
      console.log("multiSig deployed at", multiSig.address);

      token = await PLC.new();
      console.log("token deployed at", token.address);

      vault = await RefundVault.new(multiSig.address, reserveWallet);
      console.log("vault deployed at", vault.address);

      crowdsale = await PLCCrowdsale.new(
        token.address,
        vault.address,
        multiSig.address,
        reserveWallet,
        timelines,
        maxEtherCap,
        minEtherCap
      );
      console.log("crowdsale deployed at", crowdsale.address);

      kyc = await KYC.new();
      console.log("kyc deployed at", kyc.address);

      await token.transferOwnership(crowdsale.address);
      await vault.transferOwnership(crowdsale.address);

      // backup
      snapshotId = await capture();

      now = moment().unix();

      startTime = await crowdsale.startTime();
      endTime = await crowdsale.endTime();

      beforeStartTime = startTime.toNumber() - duration.seconds(100);
      afterStartTime = startTime.toNumber() + duration.seconds(1);
      afterEndTime = endTime.toNumber() + duration.seconds(1);

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
    });

    beforeEach(async () => {
      // restore
      await restore(snapshotId);

      // backup
      snapshotId = await capture();

      // proceed 20 block
      for (const i of Array(20)) {
        await advanceBlock();
      }
    });

    describe("Crowdsale", async () => {
      // before start
      it("should reject payments before start", async () => {
        await increaseTimeTo(beforeStartTime);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.send(ether(1))
          .should.be.rejectedWith(EVMThrow);

        await crowdsale
          .buyTokens(investor, { from: investor, value: ether(1) })
          .should.be.rejectedWith(EVMThrow);
      });

      // after start
      it("should reject unregistered payments during the sale", async () => {
        await increaseTimeTo(afterStartTime);

        const investmentAmount = ether(1);

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        }).should.be.rejectedWith(EVMThrow);
      });

      it("should accept registered payments during the sale", async () => {
        const investmentAmount = ether(1);
        const rate = rates[ 0 ];
        const expectedTokenAmount = investmentAmount.mul(rate);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);
        (await token.totalSupply())
          .should.be.bignumber.equal(expectedTokenAmount);
      });

      it("should mint following rate for each stage", async () => {
        const investmentAmount = ether(1);
        let expectedTokenAmount = new BigNumber(0);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        for (let i = 0; i < 5; i++) {
          await increaseTimeTo(timelines[ i+1 ] - 100);
          const rate = rates[ i ];

          expectedTokenAmount = expectedTokenAmount.add(investmentAmount.mul(rate));

          // proceed 20 block
          for (const i of Array(20)) {
            await advanceBlock();
          }

          await crowdsale.buyTokens(investor, {
            value: investmentAmount,
            from: investor,
          }).should.be.fulfilled;

          (await token.balanceOf(investor))
            .should.be.bignumber.equal(expectedTokenAmount);
          (await token.totalSupply())
            .should.be.bignumber.equal(expectedTokenAmount);
        }
      });

      it("should reject payments over 5000 ether", async () => {
        const investmentAmount = ether(5001);

        const balanceBeforeInvest = await eth.getBalance(investor);

        const rate = await crowdsale.getRate();
        const expectedTokenAmount = maxGuaranteedLimit.mul(rate);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        }).should.be.fulfilled;

        const balanceAfterInvest = await eth.getBalance(investor);

        // toReturn
        (balanceBeforeInvest - balanceAfterInvest).should.be.within(
          ether(5000).toNumber(),
          ether(5001).toNumber(),
        );

        // toFund
        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);
        (await token.totalSupply())
          .should.be.bignumber.equal(expectedTokenAmount);
      });

      it("should reject frequent payments in 20 blocks", async () => {
        const investmentAmount = ether(1);

        await crowdsale.register(investor)
          .should.be.fulfilled;

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
        for (const account of accounts.slice(0, 20)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: ether(5000),
            from: account,
          }).should.be.fulfilled;
        }

        const investmentAmount = ether(1);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale
          .buyTokens(investor, {
            value: investmentAmount,
            from: investor,
          })
          .should.be.rejectedWith(EVMThrow);
      });

      it("should accept toFund and return toReturn", async () => {
        const rate = await crowdsale.getRate();
        const investmentAmount = ether(101);

        // 20 accounts, total 99,900 ether
        for (const account of accounts.slice(0, 20)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: ether(4995),
            from: account,
          }).should.be.fulfilled;
        }

        const balanceBeforeInvest = await eth.getBalance(investor);

        const beforeTokenAmount = ether(99900).mul(rate);
        const expectedTokenAmount = ether(100).mul(rate);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        }).should.be.fulfilled;

        const balanceAfterInvest = await eth.getBalance(investor);

        // toReturn
        (balanceBeforeInvest - balanceAfterInvest).should.be.within(
          ether(100).toNumber(),
          ether(101).toNumber(),
        );

        // toFund
        (await token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
        (await token.totalSupply()).should.be.bignumber.equal(
          beforeTokenAmount.add(expectedTokenAmount),
        );
      });

      it("can finalized during the sale (maxReached)", async () => {
        const investmentAmount = ether(5000);

        // 20 accounts, total 100,000 ether
        for (const account of accounts.slice(0, 20)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: investmentAmount,
            from: account,
          }).should.be.fulfilled;
        }

        const vaultAddress = await crowdsale.vault();

        (await crowdsale.weiRaised())
          .should.be.bignumber.equal(maxEtherCap);

        (await eth.getBalance(vaultAddress))
          .should.be.bignumber.equal(maxEtherCap);

        await crowdsale.finalize()
          .should.be.fulfilled;
      });

      it("should reject payments after finalized", async () => {
        const investmentAmount = ether(5000);

        // 20 accounts, total 100,000 ether
        for (const account of accounts.slice(0, 20)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: investmentAmount,
            from: account,
          })
            .should.be.fulfilled;
        }

        await crowdsale.finalize()
          .should.be.fulfilled;
        await crowdsale.send(ether(1))
          .should.be.rejectedWith(EVMThrow);
        await crowdsale
          .buyTokens(investor, { value: ether(1), from: investor })
          .should.be.rejectedWith(EVMThrow);
      });

      // Presale
      it("should mint all presaled amount", async () => {
        const presaledAmount = ether(5000);

        await crowdsale.registerWithPreSale(investor, presaledAmount)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: presaledAmount,
          from: investor,
        })
          .should.be.fulfilled;

        const expectedTokenAmount = presaledAmount.mul(presaleRate);

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);

        (await token.totalSupply())
          .should.be.bignumber.equal(expectedTokenAmount);
      });

      it("should mint mixed amount (presale amount first)", async () => {
        const investmentAmount = ether(5000);
        const presaledAmount = ether(3000);
        const rate = await crowdsale.getRate();

        await crowdsale.registerWithPreSale(investor, presaledAmount)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: presaledAmount,
          from: investor,
        })
          .should.be.fulfilled;

        let expectedTokenAmount = presaledAmount.mul(presaleRate);

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);

        // proceed 20 block
        for (const i of Array(20)) {
          await advanceBlock();
        }

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        })
          .should.be.fulfilled;

        expectedTokenAmount = expectedTokenAmount.add(investmentAmount.mul(rate));

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);

        (await token.totalSupply())
          .should.be.bignumber.equal(expectedTokenAmount);
      });

      it("should mint mixed amount (presale amount last)", async () => {
        const investmentAmount = ether(5000);
        const presaledAmount = ether(3000);
        const rate = await crowdsale.getRate();

        await crowdsale.registerWithPreSale(investor, presaledAmount)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        })
          .should.be.fulfilled;

        let expectedTokenAmount = presaledAmount.mul(presaleRate)
          .add(investmentAmount.sub(presaledAmount).mul(rate));

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);

        // proceed 20 block
        for (const i of Array(20)) {
          await advanceBlock();
        }

        await crowdsale.buyTokens(investor, {
          value: presaledAmount,
          from: investor,
        })
          .should.be.fulfilled;

        expectedTokenAmount = expectedTokenAmount.add(presaledAmount.mul(rate));

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(expectedTokenAmount);

        (await token.totalSupply())
          .should.be.bignumber.equal(expectedTokenAmount);
      });

      // Pausable
      it("should be able to pause", async () => {
        const investmentAmount = ether(5000);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.pause()
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, {
          value: investmentAmount,
          from: investor,
        })
          .should.be.rejectedWith(EVMThrow);
      });

      it("should reject registration when paused", async () => {
        await crowdsale.pause()
          .should.be.fulfilled;

        await crowdsale.register(investor)
          .should.be.rejectedWith(EVMThrow);
      });

      it("should be able to finalize when paused", async () => {
        const numInvestor = 4;
        const eachInvestmentAmount = ether(5000);
        const totalInvestmentAmount = eachInvestmentAmount.mul(numInvestor);

        // 4 accounts, total 20,000 ether
        for (const account of accounts.slice(0, numInvestor)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: eachInvestmentAmount,
            from: account,
          }).should.be.fulfilled;
        }

        await crowdsale.pause()
          .should.be.fulfilled;

        await crowdsale.finalizeWhenForked()
          .should.be.fulfilled;

        // Ether Distribution
        const expectedDevBalance = new BigNumber(0);
        const expectedEachReserveBalance = new BigNumber(0);

        (await eth.getBalance(multiSig.address)).should.be.bignumber.equal(expectedDevBalance);
        reserveWallet.forEach(async (wallet) => {
          (await eth.getBalance(wallet)).should.be.bignumber.equal(expectedEachReserveBalance);
        });

        // refund claim
        for (const account of accounts.slice(0, numInvestor)) {
          const balanceBeforeRefund = await eth.getBalance(account);
          await crowdsale.claimRefund({ from: account }).should.be.fulfilled;
          const balanceAfterRefund = await eth.getBalance(account);

          (balanceAfterRefund - balanceBeforeRefund).should.be.within(
            ether(4999).toNumber(),
            ether(5000).toNumber(),
          );
        }
      });

      // endTime
      // it("can be finalized after endTime", async () => {
      //   const numInvestor = 8;
      //   const eachInvestmentAmount = ether(5000);
      //   const totalInvestmentAmount = eachInvestmentAmount.mul(numInvestor);
      //
      //   // 8 accounts, total 40,000 ether
      //   for (const account of accounts.slice(0, numInvestor)) {
      //     await crowdsale.register(account)
      //       .should.be.fulfilled;
      //
      //     await crowdsale.buyTokens(account, {
      //       value: eachInvestmentAmount,
      //       from: account,
      //     })
      //       .should.be.fulfilled;
      //   }
      //
      //   await increaseTimeTo(afterEndTime);
      //
      //   await crowdsale.finalize()
      //     .should.be.fulfilled;
      //
      //   // Ether Distribution
      //   const expectedDevBalance = totalInvestmentAmount.div(10);
      //   const expectedEachReserveBalance = totalInvestmentAmount.mul(18).div(100);
      //
      //   (await eth.getBalance(multiSig.address))
      //     .should.be.bignumber.equal(expectedDevBalance);
      //
      //   reserveWallet.forEach(async (wallet) => {
      //     (await eth.getBalance(wallet))
      //       .should.be.bignumber.equal(expectedEachReserveBalance);
      //   });
      //
      //   // Token Distribution
      //   const totalSupply = await token.totalSupply();
      //   const expectedDevTokenBalance = totalSupply.mul(10).div(100);
      //   const expectedEachReserveTokenBalance = totalSupply.mul(2).div(100);
      //
      //   (await token.balanceOf(multiSig.address))
      //     .should.be.bignumber.equal(expectedDevTokenBalance);
      //
      //   for (let i = 0; i < 5; i++) {
      //     (await token.balanceOf(reserveWallet[ i ]))
      //       .should.be.bignumber.equal(expectedEachReserveTokenBalance);
      //   }
      // });

      // endTime 2
      it("can be finalized after endTime (when minEtherCap is not reached)", async () => {
        const numInvestor = 4;
        const eachInvestmentAmount = ether(5000);
        const totalInvestmentAmount = eachInvestmentAmount.mul(numInvestor);

        // 8 accounts, total 40,000 ether
        for (const account of accounts.slice(0, numInvestor)) {
          await crowdsale.register(account)
            .should.be.fulfilled;

          await crowdsale.buyTokens(account, {
            value: eachInvestmentAmount,
            from: account,
          }).should.be.fulfilled;
        }

        await increaseTimeTo(afterEndTime);

        await crowdsale.finalize().should.be.fulfilled;

        // Ether Distribution
        const expectedDevBalance = new BigNumber(0);
        const expectedEachReserveBalance = new BigNumber(0);

        (await eth.getBalance(multiSig.address)).should.be.bignumber.equal(expectedDevBalance);
        reserveWallet.forEach(async (wallet) => {
          (await eth.getBalance(wallet)).should.be.bignumber.equal(expectedEachReserveBalance);
        });

        // refund claim
        for (const account of accounts.slice(0, numInvestor)) {
          const balanceBeforeRefund = await eth.getBalance(account);
          await crowdsale.claimRefund({ from: account }).should.be.fulfilled;
          const balanceAfterRefund = await eth.getBalance(account);

          (balanceAfterRefund - balanceBeforeRefund).should.be.within(
            ether(4999).toNumber(),
            ether(5000).toNumber(),
          );
        }
      });

      // afterEndTime
      it("should reject payments after end", async () => {
        await crowdsale.send(ether(1))
          .should.be.rejectedWith(EVMThrow);

        await crowdsale.register(investor)
          .should.be.fulfilled;

        await crowdsale.buyTokens(investor, { value: ether(1), from: investor })
          .should.be.rejectedWith(EVMThrow);
      });

      it("should be able to change Token Owner", async () => {
        await token.pause()
          .should.be.rejectedWith(EVMThrow);

        // change token owner
        await crowdsale.changeTokenOwner(owner);
        (await token.owner())
          .should.be.equal(owner);

        // token pause
        await token.pause()
          .should.be.fulfilled;
      });
    });
  },
);
