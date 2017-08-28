import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import increaseTime, { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore } from "./helpers/snapshot";
import timer from "./helpers/timer";

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const PLC = artifacts.require("PLC.sol");

contract("PLC", async ([ owner, , , , , , , , ...accounts ]) => {
  let token;

  beforeEach(async () => {
    token = await PLC.new();
  });

  // test mintable
  describe("test minting", async () => {
    it("should start with a totalSupply of 0", async () => {
      (await token.totalSupply()).should.be.bignumber.equal(0);
    });

    it("should return mintingFinished false after construction", async () => {
      (await token.mintingFinished()).should.be.equal(false);
    });

    it("should mint a given amount of tokens to a given address", async () => {
      await token.mint(owner, 100);

      (await token.balanceOf(owner)).should.be.bignumber.equal(100);
      (await token.totalSupply()).should.be.bignumber.equal(100);
    });
  });

  // test pausable
  describe("test pause", async () => {
    beforeEach(async () => {
      await token.mint(owner, 100).should.be.fulfilled;
    });

    it("should return paused false after construction", async () => {
      (await token.paused()).should.be.equal(false);
    });

    it("should return paused true after pause", async () => {
      await token.pause().should.be.fulfilled;
      (await token.paused()).should.be.equal(true);
    });

    it("should return paused false after pause and unpause", async () => {
      await token.pause().should.be.fulfilled;
      await token.unpause().should.be.fulfilled;
      (await token.paused()).should.be.equal(false);
    });

    it("should be able to transfer if transfers are unpaused", async () => {
      await token.transfer(accounts[ 1 ], 100).should.be.fulfilled;

      (await token.balanceOf(owner)).should.be.bignumber.equal(0);
      (await token.balanceOf(accounts[ 1 ])).should.be.bignumber.equal(100);
    });

    it("should be able to transfer after transfers are paused and unpaused", async () => {
      await token.pause().should.be.fulfilled;
      await token.unpause().should.be.fulfilled;
      await token.transfer(accounts[ 1 ], 100).should.be.fulfilled;

      (await token.balanceOf(owner)).should.be.bignumber.equal(0);
      (await token.balanceOf(accounts[ 1 ])).should.be.bignumber.equal(100);
    });

    it("should throw an error trying to transfer while transactions are paused", async () => {
      await token.pause();
      await token.transfer(accounts[ 1 ], 100, { from: owner }).should.be.rejectedWith(EVMThrow);
    });

    it("should throw an error trying to transfer from another account while transactions are paused", async () => {
      await token.pause();
      await token
        .transferFrom(owner, accounts[ 1 ], 100, {
          from: owner,
        })
        .should.be.rejectedWith(EVMThrow);
    });
  });

  // test vesting
  describe("test vesting", async () => {
    const tokenAmount = 50;

    const granter = owner;
    const receiver = accounts[ 1 ];
    let now = 0;

    beforeEach(async () => {
      await token.mint(owner, 100);
      now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    });

    it("granter can grant tokens without vesting", async () => {
      await token.transfer(receiver, tokenAmount, { from: granter }).should.be.fulfilled;

      (await token.balanceOf(receiver)).should.be.bignumber.equal(tokenAmount);

      (await token.transferableTokens(receiver, now)).should.be.bignumber.equal(tokenAmount);
    });

    describe("getting a revokable/non-burnable token grant", async () => {
      const cliff = 10000;
      const vesting = 20000; // seconds

      beforeEach(async () => {
        await token.grantVestedTokens(
          receiver,
          tokenAmount,
          now,
          now + cliff,
          now + vesting,
          true,
          false,
          { from: granter },
        );
      });

      it("tokens are received", async () => {
        (await token.balanceOf(receiver)).should.be.bignumber.equal(tokenAmount);
      });

      it("has 0 transferable tokens before cliff", async () => {
        (await token.transferableTokens(receiver, now)).should.be.bignumber.equal(0);
      });

      it("all tokens are transferable after vesting", async () => {
        (await token.transferableTokens(receiver, now + vesting)).should.be.bignumber.equal(
          tokenAmount,
        );
      });

      it("throws when trying to transfer from non vested tokens", async () => {
        await token.approve(accounts[ 7 ], 1, { from: receiver }).should.be.fulfilled;

        await token
          .transferFrom(receiver, accounts[ 7 ], tokenAmount, { from: accounts[ 7 ] })
          .should.be.rejectedWith(EVMThrow);
      });

      it("can be revoked by granter", async () => {
        await token.revokeTokenGrant(receiver, 0, { from: granter }).should.be.fulfilled;
        (await token.balanceOf(receiver)).should.be.bignumber.equal(0);
        (await token.balanceOf(granter)).should.be.bignumber.equal(100);
      });

      it("cannot be revoked by non granter", async () => {
        await token
          .revokeTokenGrant(receiver, 0, { from: accounts[ 3 ] })
          .should.be.rejectedWith(EVMThrow);
      });

      it("can be revoked by granter and non vested tokens are returned", async () => {
        await timer(cliff);
        await token.revokeTokenGrant(receiver, 0, { from: granter }).should.be.fulfilled;
        (await token.balanceOf(receiver)).should.be.bignumber.equal(tokenAmount * cliff / vesting);
      });

      it("can transfer all tokens after vesting ends", async () => {
        await timer(vesting);
        await token.transfer(accounts[ 7 ], tokenAmount, { from: receiver }).should.be.fulfilled;
        (await token.balanceOf(accounts[ 7 ])).should.be.bignumber.equal(tokenAmount);
      });

      it("can approve and transferFrom all tokens after vesting ends", async () => {
        await timer(vesting);
        await token.approve(accounts[ 7 ], tokenAmount, { from: receiver }).should.be.fulfilled;
        await token.transferFrom(receiver, accounts[ 7 ], tokenAmount, { from: accounts[ 7 ] }).should
          .be.fulfilled;
        (await token.balanceOf(accounts[ 7 ])).should.be.bignumber.equal(tokenAmount);
      });

      it("can handle composed vesting schedules", async () => {
        await timer(cliff);
        await token.transfer(accounts[ 7 ], 12, { from: receiver });
        (await token.balanceOf(accounts[ 7 ])).should.be.bignumber.equal(12);

        const newNow = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

        await token.grantVestedTokens(
          receiver,
          tokenAmount,
          newNow,
          newNow + cliff,
          newNow + vesting,
          false,
          false,
          { from: granter },
        ).should.be.fulfilled;

        await token.transfer(accounts[ 7 ], 13, { from: receiver }).should.be.fulfilled;
        (await token.balanceOf(accounts[ 7 ])).should.be.bignumber.equal(tokenAmount / 2);

        (await token.balanceOf(receiver)).should.be.bignumber.equal(3 * tokenAmount / 2);
        (await token.transferableTokens(receiver, newNow)).should.be.bignumber.equal(0);

        await timer(vesting);
        await token.transfer(accounts[ 7 ], 3 * tokenAmount / 2, { from: receiver }).should.be
          .fulfilled;
        (await token.balanceOf(accounts[ 7 ])).should.be.bignumber.equal(tokenAmount * 2);
      });
    });

    describe("getting a non-revokable token grant", async () => {
      const cliff = 10000;
      const vesting = 20000; // seconds

      beforeEach(async () => {
        await token.grantVestedTokens(
          receiver,
          tokenAmount,
          now,
          now + cliff,
          now + vesting,
          false,
          false,
          { from: granter },
        );
      });

      it("tokens are received", async () => {
        (await token.balanceOf(receiver)).should.be.bignumber.equal(tokenAmount);
      });

      it("throws when granter attempts to revoke", async () => {
        await token
          .revokeTokenGrant(receiver, 0, { from: granter })
          .should.be.rejectedWith(EVMThrow);
      });
    });

    describe("getting a revokable/burnable token grant", async () => {
      const cliff = 100000;
      const vesting = 200000; // seconds
      const burnAddress = "0x000000000000000000000000000000000000dead";

      beforeEach(async () => {
        await token.grantVestedTokens(
          receiver,
          tokenAmount,
          now,
          now + cliff,
          now + vesting,
          true,
          true,
          { from: granter },
        );
      });

      it("tokens are received", async () => {
        (await token.balanceOf(receiver)).should.be.bignumber.equal(tokenAmount);
      });

      it("can be revoked by granter and tokens are burned", async () => {
        await token.revokeTokenGrant(receiver, 0, { from: granter }).should.be.fulfilled;
        (await token.balanceOf(receiver)).should.be.bignumber.equal(0);
        (await token.balanceOf(burnAddress)).should.be.bignumber.equal(tokenAmount);
      });

      it("cannot be revoked by non granter", async () => {
        await token
          .revokeTokenGrant(receiver, 0, { from: accounts[ 3 ] })
          .should.be.rejectedWith(EVMThrow);
      });

      it("can be revoked by granter and non vested tokens are returned", async () => {
        await timer(cliff);
        await token.revokeTokenGrant(receiver, 0, { from: granter }).should.be.fulfilled;
        (await token.balanceOf(burnAddress)).should.be.bignumber.equal(
          tokenAmount * cliff / vesting,
        );
      });
    });
  });
});
