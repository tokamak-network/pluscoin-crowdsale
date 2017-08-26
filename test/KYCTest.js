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

const KYC = artifacts.require("KYC.sol");

contract("KYC", async ([ owner, , , , , , , , ...accounts ]) => {
  let kyc;

  beforeEach(async () => {
    kyc = await KYC.new();
  });

  describe("Without key", async () => {
    describe("Without presale", async () => {
      const idx0 = accounts.length / 4;
      const idx1 = accounts.length * 2 / 4;
      const idx2 = accounts.length * 3 / 4;
      const idx3 = accounts.length;

      it("should register new user initially", async () => {
        for (const account of accounts.slice(0, idx0)) {
          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.register(account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register new user after paused", async () => {
        await kyc.pause();

        for (const account of accounts.slice(idx0, idx1)) {
          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.register(account)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(false);
        }
      });

      it("should register new user after paused and unpaused", async () => {
        await kyc.pause();
        await kyc.unpause();

        for (const account of accounts.slice(idx1, idx2)) {
          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.register(account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register user who previously added with presale", async () => {
        for (const account of accounts.slice(idx2, idx3)) {
          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.register(account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }

        for (const account of accounts.slice(idx2, idx3)) {
          await kyc.register(account)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });
    });

    describe("With presale", async () => {
      const idx0 = accounts.length / 4;
      const idx1 = accounts.length * 2 / 4;
      const idx2 = accounts.length * 3 / 4;
      const idx3 = accounts.length;

      it("should register new user initially", async () => {
        for (const account of accounts.slice(0, idx0)) {
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithPreSale(account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register new user after paused", async () => {
        await kyc.pause();

        for (const account of accounts.slice(idx0, idx1)) {
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithPreSale(account, amount)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(false);
        }
      });

      it("should register new user after paused and unpaused", async () => {
        await kyc.pause();
        await kyc.unpause();

        for (const account of accounts.slice(idx1, idx2)) {
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithPreSale(account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register user who previously added with presale", async () => {
        for (const account of accounts.slice(idx2, idx3)) {
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithPreSale(account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }

        for (const account of accounts.slice(idx2, idx3)) {
          const amount = ether(Math.floor(Math.random() * 4900));

          await kyc.registerWithPreSale(account, amount)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });
    });
  });

  describe("With key", async () => {
    describe("Without presale", async () => {
      const idx0 = accounts.length / 4;
      const idx1 = accounts.length * 2 / 4;
      const idx2 = accounts.length * 3 / 4;
      const idx3 = accounts.length;

      it("should register new user initially", async () => {
        for (const account of accounts.slice(0, idx0)) {
          const key = web3.sha3(account);

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKey(key, account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register new user after paused", async () => {
        await kyc.pause();

        for (const account of accounts.slice(idx0, idx1)) {
          const key = web3.sha3(account);

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKey(key, account)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(false);
        }
      });

      it("should register new user after paused and unpaused", async () => {
        await kyc.pause();
        await kyc.unpause();

        for (const account of accounts.slice(idx1, idx2)) {
          const key = web3.sha3(account);

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKey(key, account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register user who previously added with presale", async () => {
        for (const account of accounts.slice(idx2, idx3)) {
          const key = web3.sha3(account);

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKey(key, account)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }

        for (const account of accounts.slice(idx2, idx3)) {
          const key = web3.sha3(account);

          await kyc.registerWithKey(key, account).should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });
    });

    describe("With presale", async () => {
      const idx0 = accounts.length / 4;
      const idx1 = accounts.length * 2 / 4;
      const idx2 = accounts.length * 3 / 4;
      const idx3 = accounts.length;

      it("should register new user initially", async () => {
        for (const account of accounts.slice(0, idx0)) {
          const key = web3.sha3(account);
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKeyAndPreSale(key, account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register new user after paused", async () => {
        await kyc.pause();

        for (const account of accounts.slice(idx0, idx1)) {
          const key = web3.sha3(account);
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKeyAndPreSale(key, account, amount)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(false);
        }
      });

      it("should register new user after paused and unpaused", async () => {
        await kyc.pause();
        await kyc.unpause();

        for (const account of accounts.slice(idx1, idx2)) {
          const key = web3.sha3(account);
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKeyAndPreSale(key, account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });

      it("should not register user who previously added with presale", async () => {
        for (const account of accounts.slice(idx2, idx3)) {
          const key = web3.sha3(account);
          const amount = ether(Math.floor(Math.random() * 4900));

          (await kyc.isRegistered(account))
            .should.be.equal(false);

          await kyc.registerWithKeyAndPreSale(key, account, amount)
            .should.be.fulfilled;

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }

        for (const account of accounts.slice(idx2, idx3)) {
          const key = web3.sha3(account);
          const amount = ether(Math.floor(Math.random() * 4900));

          await kyc.registerWithKeyAndPreSale(key, account, amount)
            .should.be.rejectedWith(EVMThrow);

          (await kyc.isRegistered(account))
            .should.be.equal(true);
        }
      });
    });
  });
});
