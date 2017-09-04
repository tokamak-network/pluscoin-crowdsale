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

  const idx0 = 0;
  const idx1 = accounts.length * 1 / 4;
  const idx2 = accounts.length * 2 / 4;
  const idx3 = accounts.length * 3 / 4;
  const idx4 = accounts.length;

  beforeEach(async () => {
    kyc = await KYC.new();
  });

  it("should register new user initially", async () => {
    for (const account of accounts.slice(0, idx0)) {
      (await kyc.isRegistered(account))
        .should.be.equal(false);

      process.exit(1);

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

  it("should unregister user", async () => {
    for (const account of accounts.slice(idx3, idx4)) {
      (await kyc.isRegistered(account))
        .should.be.equal(false);

      await kyc.register(account)
        .should.be.fulfilled;

      (await kyc.isRegistered(account))
        .should.be.equal(true);

      await kyc.unregister(account)
        .should.be.fulfilled;

      (await kyc.isRegistered(account))
        .should.be.equal(false);
    }
  });
});
