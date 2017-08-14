'use strict';

const assertJump = require('./helpers/assertJump');
const timer = require('./helpers/timer');
var PLCToken = artifacts.require('../contracts/Tokens/PLCToken.sol');

contract('PLCToken', function(accounts) {
  let token;

  beforeEach(async function() {
    token = await PLCToken.new();
  });

  //test mintable
  describe('test minting', async ()=>{
    it('should start with a totalSupply of 0', async function() {
      let totalSupply = await token.totalSupply();

      assert.equal(totalSupply, 0);
    });

    it('should return mintingFinished false after construction', async function() {
      let mintingFinished = await token.mintingFinished();

      assert.equal(mintingFinished, false);
    });

    it('should mint a given amount of tokens to a given address', async function() {
      await token.mint(accounts[0], 100);

      let balance0 = await token.balanceOf(accounts[0]);
      assert(balance0, 100);

      let totalSupply = await token.totalSupply();
      assert(totalSupply, 100);
    });
  })


  //test pausable
  describe('test pause',async ()=>{
    beforeEach(async function() {
      await token.mint(accounts[0], 100);
    });

    it('should return paused false after construction', async function() {
      let paused = await token.paused();

      assert.equal(paused, false);
    });

    it('should return paused true after pause', async function() {
      await token.pause();
      let paused = await token.paused();

      assert.equal(paused, true);
    });

    it('should return paused false after pause and unpause', async function() {
      await token.pause();
      await token.unpause();
      let paused = await token.paused();

      assert.equal(paused, false);
    });

    it('should be able to transfer if transfers are unpaused', async function() {
      await token.transfer(accounts[1], 100);
      let balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 0);

      let balance1 = await token.balanceOf(accounts[1]);
      assert.equal(balance1, 100);
    });

    it('should be able to transfer after transfers are paused and unpaused', async function() {
      await token.pause();
      await token.unpause();
      await token.transfer(accounts[1], 100);
      let balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 0);

      let balance1 = await token.balanceOf(accounts[1]);
      assert.equal(balance1, 100);
    });

    it('should throw an error trying to transfer while transactions are paused', async function() {
      await token.pause();
      try {
        await token.transfer(accounts[1], 100);
        assert.fail('should have thrown before');
      } catch (error) {
        assertJump(error);
      }
    });

    it('should throw an error trying to transfer from another account while transactions are paused', async function() {
      await token.pause();
      try {
        await token.transferFrom(accounts[0], accounts[1], 100);
        assert.fail('should have thrown before');
      } catch (error) {
        assertJump(error);
      }
    });
  })

  //test vesting
  describe('test vesting',async ()=>{
    const tokenAmount = 50

    const granter = accounts[0]
    const receiver = accounts[1]
    let now = 0
    beforeEach(async () => {
      await token.mint(accounts[0], 100);
      now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    })

    it('granter can grant tokens without vesting', async () => {
      await token.transfer(receiver, tokenAmount, { from: granter })

      assert.equal(await token.balanceOf(receiver), tokenAmount);
      assert.equal(await token.transferableTokens(receiver, now), tokenAmount);
    })

    describe('getting a revokable/non-burnable token grant', async () => {
      const cliff = 10000
      const vesting = 20000 // seconds

      beforeEach(async () => {
        await token.grantVestedTokens(receiver, tokenAmount, now, now + cliff, now + vesting, true, false, { from: granter })
      })

      it('tokens are received', async () => {
        assert.equal(await token.balanceOf(receiver), tokenAmount);
      })

      it('has 0 transferable tokens before cliff', async () => {
        assert.equal(await token.transferableTokens(receiver, now), 0);
      })

      it('all tokens are transferable after vesting', async () => {
        assert.equal(await token.transferableTokens(receiver, now + vesting), tokenAmount);
      })

      it('throws when trying to transfer non vested tokens', async () => {
        try {
          await token.transfer(accounts[7], 1, { from: receiver })
          assert.fail('should have thrown before');
        } catch(error) {
          assertJump(error);
        }
      })

      it('throws when trying to transfer from non vested tokens', async () => {
        try {
          await token.approve(accounts[7], 1, { from: receiver })
          await token.transferFrom(receiver, accounts[7], tokenAmount, { from: accounts[7] })
          assert.fail('should have thrown before');
        } catch(error) {
          assertJump(error);
        }
      })

      it('can be revoked by granter', async () => {
        await token.revokeTokenGrant(receiver, 0, { from: granter });
        assert.equal(await token.balanceOf(receiver), 0);
        assert.equal(await token.balanceOf(granter), 100);
      })

      it('cannot be revoked by non granter', async () => {
        try {
          await token.revokeTokenGrant(receiver, 0, { from: accounts[3] });
          assert.fail('should have thrown before');
        } catch(error) {
          assertJump(error);
        }
      })

      it('can be revoked by granter and non vested tokens are returned', async () => {
        await timer(cliff);
        await token.revokeTokenGrant(receiver, 0, { from: granter });
        assert.equal(await token.balanceOf(receiver), tokenAmount * cliff / vesting);
      })

      it('can transfer all tokens after vesting ends', async () => {
        await timer(vesting);
        await token.transfer(accounts[7], tokenAmount, { from: receiver })
        assert.equal(await token.balanceOf(accounts[7]), tokenAmount);
      })

      it('can approve and transferFrom all tokens after vesting ends', async () => {
        await timer(vesting);
        await token.approve(accounts[7], tokenAmount, { from: receiver })
        await token.transferFrom(receiver, accounts[7], tokenAmount, { from: accounts[7] })
        assert.equal(await token.balanceOf(accounts[7]), tokenAmount);
      })

      it('can handle composed vesting schedules', async () => {
        await timer(cliff);
        await token.transfer(accounts[7], 12, { from: receiver })
        assert.equal(await token.balanceOf(accounts[7]), 12);

        let newNow = web3.eth.getBlock(web3.eth.blockNumber).timestamp

        await token.grantVestedTokens(receiver, tokenAmount, newNow, newNow + cliff, newNow + vesting, false, false, { from: granter })

        await token.transfer(accounts[7], 13, { from: receiver })
        assert.equal(await token.balanceOf(accounts[7]), tokenAmount / 2);

        assert.equal(await token.balanceOf(receiver), 3 * tokenAmount / 2)
        assert.equal(await token.transferableTokens(receiver, newNow), 0)
        await timer(vesting);
        await token.transfer(accounts[7], 3 * tokenAmount / 2, { from: receiver })
        assert.equal(await token.balanceOf(accounts[7]), tokenAmount * 2)
      })
    })

    describe('getting a non-revokable token grant', async () => {
      const cliff = 10000
      const vesting = 20000 // seconds

      beforeEach(async () => {
        await token.grantVestedTokens(receiver, tokenAmount, now, now + cliff, now + vesting, false, false, { from: granter })
      })

      it('tokens are received', async () => {
        assert.equal(await token.balanceOf(receiver), tokenAmount);
      })

      it('throws when granter attempts to revoke', async () => {
        try {
          await token.revokeTokenGrant(receiver, 0, { from: granter });
          assert.fail('should have thrown before');
        } catch(error) {
          assertJump(error);
        }
      })
    })

    describe('getting a revokable/burnable token grant', async () => {
      const cliff = 100000
      const vesting = 200000 // seconds
      const burnAddress = '0x000000000000000000000000000000000000dead'

      beforeEach(async () => {
        await token.grantVestedTokens(receiver, tokenAmount, now, now + cliff, now + vesting, true, true, { from: granter })
      })

      it('tokens are received', async () => {
        assert.equal(await token.balanceOf(receiver), tokenAmount);
      })

      it('can be revoked by granter and tokens are burned', async () => {
        await token.revokeTokenGrant(receiver, 0, { from: granter });
        assert.equal(await token.balanceOf(receiver), 0);
        assert.equal(await token.balanceOf(burnAddress), tokenAmount);
      })

      it('cannot be revoked by non granter', async () => {
        try {
          await token.revokeTokenGrant(receiver, 0, { from: accounts[3] });
          assert.fail('should have thrown before');
        } catch(error) {
          assertJump(error);
        }
      })

      it('can be revoked by granter and non vested tokens are returned', async () => {
        await timer(cliff);
        await token.revokeTokenGrant(receiver, 0, { from: granter });
        assert.equal(await token.balanceOf(burnAddress), tokenAmount * cliff / vesting);
      })
    })
  })

});
