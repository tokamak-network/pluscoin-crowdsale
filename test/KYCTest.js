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

  describe("Adding user", async () => {
    const idx0 = accounts.length / 4;
    const idx1 = accounts.length * 2 / 4;
    const idx2 = accounts.length * 3 / 4;
    const idx3 = accounts.length;

    it("should add new user initially", async () => {
      for (const account of accounts.slice(0, idx0)) {
        const key = web3.sha3(Date.now() + account);
        await kyc.addUser(key, account).should.be.fulfilled;
      }
    });

    it("should not add new user after paused", async () => {
      await kyc.pause();

      for (const account of accounts.slice(idx0, idx1)) {
        const key = web3.sha3(Date.now() + account);
        await kyc.addUser(key, account).should.be.rejectedWith(EVMThrow);
      }
    });

    it("should add new user after paused and unpaused", async () => {
      await kyc.pause();
      await kyc.unpause();

      for (const account of accounts.slice(idx1, idx2)) {
        const key = web3.sha3(Date.now() + account);
        await kyc.addUser(key, account).should.be.fulfilled;
      }
    });

    it("should not add user who previously added with presale", async () => {
      for (const account of accounts.slice(idx2, idx3)) {
        const key = web3.sha3(Date.now() + account);

        await kyc.addUser(key, account).should.be.fulfilled;
      }

      for (const account of accounts.slice(idx2, idx3)) {
        const key = web3.sha3(Date.now() + account);

        await kyc.addUser(key, account).should.be.rejectedWith(EVMThrow);
      }
    });
  });

  describe("Adding user with presaled", async () => {
    const idx0 = accounts.length / 4;
    const idx1 = accounts.length * 2 / 4;
    const idx2 = accounts.length * 3 / 4;
    const idx3 = accounts.length;

    it("should add new user initially", async () => {
      for (const account of accounts.slice(0, idx0)) {
        const key = web3.sha3(Date.now() + account);
        const amount = ether(Math.floor(Math.random() * 4900));

        await kyc.addUserWithPreSale(key, account, amount).should.be.fulfilled;
      }
    });

    it("should not add new user after paused", async () => {
      await kyc.pause();

      for (const account of accounts.slice(idx0, idx1)) {
        const key = web3.sha3(Date.now() + account);
        const amount = ether(Math.floor(Math.random() * 4900));

        await kyc.addUserWithPreSale(key, account, amount).should.be.rejectedWith(EVMThrow);
      }
    });

    it("should add new user after paused and unpaused", async () => {
      await kyc.pause();
      await kyc.unpause();

      for (const account of accounts.slice(idx1, idx2)) {
        const key = web3.sha3(Date.now() + account);
        const amount = ether(Math.floor(Math.random() * 4900));

        await kyc.addUserWithPreSale(key, account, amount).should.be.fulfilled;
      }
    });

    it("should not add user who previously added with presale", async () => {
      for (const account of accounts.slice(idx2, idx3)) {
        const key = web3.sha3(Date.now() + account);
        const amount = ether(Math.floor(Math.random() * 4900));

        await kyc.addUserWithPreSale(key, account, amount).should.be.fulfilled;
      }

      for (const account of accounts.slice(idx2, idx3)) {
        const key = web3.sha3(Date.now() + account);
        const amount = ether(Math.floor(Math.random() * 4900));

        await kyc.addUserWithPreSale(key, account, amount).should.be.rejectedWith(EVMThrow);
      }
    });
  });
});
