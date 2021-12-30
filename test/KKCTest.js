const {
  constants,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

let KKCInstance;
let KKCContract;
let owner;
let account1, account2, account3;
let baseURI =
  "https://kkc.mypinata.cloud/ipfs/QmRea1cBWCJrvGqnELZvrMUD3VwNiatnvGgwXJgWTyvUaj/";
let unrevealBaseURI =
  "https://kkc.mypinata.cloud/ipfs/QmZfogZUnkqjduWGGyfFSpmXCaND8kqEDDvtLxYvvLVAy1/";
let pricePerNFT = 0.075;
let pricePerNFTWei;
let tokenDecimals = 18;

describe("KKC", function () {
  beforeEach(async function () {
    [owner, account1, account2, account3] = await ethers.getSigners();

    KKCInstance = await ethers.getContractFactory("KKC");
    KKCContract = await KKCInstance.deploy(owner.address);
    await KKCContract.deployed();
  });
  describe("When batchmint NFTs", function () {
    it("Check the initial owned NFTs", async function () {
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(0);
      expect(await KKCContract.getLastTokenId()).to.be.equal(0);
    });
    it("Revert when non-owner mint", async function () {
      await expectRevert(
        KKCContract.connect(account1).BatchMint(account1.address, 5),
        "Ownable: caller is not the owner"
      );
    });
    it("Revert when amount is 0 or negative", async function () {
      await expectRevert(
        KKCContract.BatchMint(account1.address, 0),
        "Should be the positive value"
      );
    });
    it("Success when owner batchmint", async function () {
      await KKCContract.BatchMint(account1.address, 5);
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(5);
      expect(await KKCContract.getLastTokenId()).to.be.equal(5);

      const tokensList1 = await KKCContract.getTokensListOwnedByUser(
        account1.address
      );
      console.log("tokensList for account1 is ", tokensList1);

      await KKCContract.BatchMint(account2.address, 4);
      expect(await KKCContract.balanceOf(account2.address)).to.be.equal(4);
      const tokensList2 = await KKCContract.getTokensListOwnedByUser(
        account2.address
      );
      console.log("tokensList for account2 is ", tokensList2);

      expect(await KKCContract.getLastTokenId()).to.be.equal(9);
      expect(await KKCContract.totalSupply()).to.be.equal(9);

      const allTokensList = await KKCContract.getAllTokensList();
      console.log("allTokensList is ", allTokensList);
    });
  });
  describe("When set baseURI and unrevealBaseURI", function () {
    it("Revert when non-owner set", async function () {
      await expectRevert(
        KKCContract.connect(account1).setBaseURI(baseURI),
        "Ownable: caller is not the owner"
      );
      await expectRevert(
        KKCContract.connect(account1).setUnrevealBaseURI(unrevealBaseURI),
        "Ownable: caller is not the owner"
      );
    });

    it("Success when owner set the baseURI and unrevealBaseURI", async function () {
      await KKCContract.setBaseURI(baseURI);
      await KKCContract.setUnrevealBaseURI(unrevealBaseURI);
      await KKCContract.BatchMint(account1.address, 5);
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(5);
      const tokenIdURI = await KKCContract.tokenURI(5);
      expect(tokenIdURI).to.be.equal(unrevealBaseURI + 5);

      console.log("tokenIdURI-5 is ", tokenIdURI);
    });
    it("Revert when get the tokenURI for nonexistent token", async function () {
      await KKCContract.setBaseURI(baseURI);
      await KKCContract.setUnrevealBaseURI(unrevealBaseURI);
      await KKCContract.BatchMint(account1.address, 5);
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(5);
      await expectRevert(
        KKCContract.tokenURI(6),
        "ERC721URIStorage: URI query for nonexistent token"
      );
    });
  });
  describe("When set pause/unpause", function () {
    it("Revert when non-owner set", async function () {
      await expectRevert(
        KKCContract.connect(account1).pause(),
        "Ownable: caller is not the owner"
      );
      await expectRevert(
        KKCContract.connect(account1).unpause(),
        "Ownable: caller is not the owner"
      );
    });
    it("Revert if owner set pause when Paused", async function () {
      expect(await KKCContract.paused()).to.be.equal(false);
      await expectRevert(KKCContract.unpause(), "Pausable: not paused");
      await KKCContract.pause();
      expect(await KKCContract.paused()).to.be.equal(true);
      await expectRevert(KKCContract.pause(), "Pausable: paused");
    });

    it("Success when owner set the pause/unpause", async function () {
      expect(await KKCContract.paused()).to.be.equal(false);
      await KKCContract.pause();
      expect(await KKCContract.paused()).to.be.equal(true);
    });
  });
  describe("When set reveal status", function () {
    it("Revert when non-owner set", async function () {
      await expectRevert(
        KKCContract.connect(account1).setReveal(true),
        "Ownable: caller is not the owner"
      );
    });
    it("Check if owner set", async function () {
      expect(await KKCContract.reveal()).to.be.equal(false);
      await KKCContract.setReveal(true);
      expect(await KKCContract.reveal()).to.be.equal(true);
    });
  });
  describe("When presale NFTs", function () {
    beforeEach(async function () {
      await KKCContract.setBaseURI(baseURI);
      await KKCContract.setUnrevealBaseURI(unrevealBaseURI);
      pricePerNFTWei = ethers.utils.parseEther(pricePerNFT.toString());
      await KKCContract.setPricePerNFT(pricePerNFTWei);
    });
    it("Check if the PricePerNFT is set correctly.", async function () {
      expect(await KKCContract.getPricePerNFT()).to.be.eql(pricePerNFTWei);
    });
    it("Revert whenPaused", async function () {
      await KKCContract.pause();
      await expectRevert(
        KKCContract.PresaleNFTs(account1.address, 5),
        "Pausable: paused"
      );
      await KKCContract.unpause();
    });
    it("Revert when amount is 0 or negative", async function () {
      await expectRevert(
        KKCContract.PresaleNFTs(account1.address, 0),
        "Should be the positive value"
      );
    });
    it("Revert when buy over 20 NFTs", async function () {
      await expectRevert(
        KKCContract.PresaleNFTs(account1.address, 25),
        "Can't buy over 20 NFTs"
      );
    });
    it("Revert when insufficient ETH is sent", async function () {
      const amountOfNFTs = 20;
      const amountSentETH = ethers.utils.parseEther("1");
      await expectRevert(
        KKCContract.connect(account1).PresaleNFTs(
          account1.address,
          amountOfNFTs,
          {
            from: account1.address,
            value: amountSentETH,
          }
        ),
        "Insufficient ETH received"
      );
    });
    it("When presale NFTs for unreveal status", async function () {
      await KKCContract.pause();
      await expectRevert(
        KKCContract.PresaleNFTs(account1.address, 5),
        "Pausable: paused"
      );
      await KKCContract.unpause();
      const provider = ethers.getDefaultProvider("http://127.0.0.1:8545/");
      account1InitBalance = await ethers.provider.getBalance(account1.address);
      account1InitBalanceDecimal =
        account1InitBalance.toString(10) / Math.pow(10, tokenDecimals);
      console.log(
        "Account1 initial balance is --------",
        account1InitBalanceDecimal
      );
      const amountOfNFTs = 20;
      const getPricePerNFT = await KKCContract.getPricePerNFT();
      const amountSentETH = BigNumber.from(getPricePerNFT).mul(amountOfNFTs);
      await KKCContract.connect(account1).PresaleNFTs(
        account1.address,
        amountOfNFTs,
        {
          from: account1.address,
          value: amountSentETH,
        }
      );
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(
        amountOfNFTs
      );
      expect(await KKCContract.getLastTokenId()).to.be.equal(amountOfNFTs);

      const tokenIdURI = await KKCContract.tokenURI(5);
      expect(tokenIdURI).to.be.equal(unrevealBaseURI + 5);

      expect(await ethers.provider.getBalance(owner.address)).to.be.within(
        ethers.utils.parseEther("10001.40"),
        ethers.utils.parseEther("10001.50")
      );
      const account1NewBalance =
        BigNumber.from(account1InitBalance).sub(amountSentETH);
      expect(await ethers.provider.getBalance(account1.address)).to.be.within(
        ethers.utils.parseEther("9998.48"),
        ethers.utils.parseEther("9998.50")
      );
    });
    it("When presale NFTs for reveal status", async function () {
      await KKCContract.setReveal(true);
      const amountOfNFTs = 20;
      const getPricePerNFT = await KKCContract.getPricePerNFT();
      const amountSentETH = BigNumber.from(getPricePerNFT).mul(amountOfNFTs);
      await KKCContract.connect(account1).PresaleNFTs(
        account1.address,
        amountOfNFTs,
        {
          from: account1.address,
          value: amountSentETH,
        }
      );
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(
        amountOfNFTs
      );
      expect(await KKCContract.getLastTokenId()).to.be.equal(amountOfNFTs);

      const tokenIdURI = await KKCContract.tokenURI(5);
      expect(tokenIdURI).to.be.equal(baseURI + 5);
    });
    it("When presale NFTs for some users", async function () {
      const amountOfNFTs = 3;
      const getPricePerNFT = await KKCContract.getPricePerNFT();
      const amountSentETH = BigNumber.from(getPricePerNFT).mul(amountOfNFTs);
      await KKCContract.connect(account1).PresaleNFTs(
        account1.address,
        amountOfNFTs,
        {
          from: account1.address,
          value: amountSentETH,
        }
      );
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(
        amountOfNFTs
      );
      await KKCContract.connect(account2).PresaleNFTs(
        account2.address,
        amountOfNFTs,
        {
          from: account2.address,
          value: amountSentETH,
        }
      );
      expect(await KKCContract.balanceOf(account2.address)).to.be.equal(
        amountOfNFTs
      );
      expect(await KKCContract.totalSupply()).to.be.equal(amountOfNFTs * 2);

      const tokensList1 = await KKCContract.getTokensListOwnedByUser(
        account1.address
      );
      console.log("tokensList for account1 is ", tokensList1);
      const tokensList2 = await KKCContract.getTokensListOwnedByUser(
        account2.address
      );
      console.log("tokensList for account2 is ", tokensList2);
      const allTokensList = await KKCContract.getAllTokensList();
      console.log("allTokensList is ", allTokensList);
    });

    it("Check the token list and balance after transfer", async function () {
      const amountOfNFTs = 4;
      const getPricePerNFT = await KKCContract.getPricePerNFT();
      const amountSentETH = BigNumber.from(getPricePerNFT).mul(amountOfNFTs);
      await KKCContract.connect(account1).PresaleNFTs(
        account1.address,
        amountOfNFTs,
        {
          from: account1.address,
          value: amountSentETH,
        }
      );

      await KKCContract.connect(account2).PresaleNFTs(
        account2.address,
        amountOfNFTs,
        {
          from: account2.address,
          value: amountSentETH,
        }
      );
      await KKCContract.connect(account1).setApprovalForAll(
        KKCContract.address,
        true
      );
      await KKCContract.connect(account1).transferFrom(
        account1.address,
        account2.address,
        3
      );
      expect(await KKCContract.balanceOf(account1.address)).to.be.equal(
        amountOfNFTs - 1
      );
      expect(await KKCContract.balanceOf(account2.address)).to.be.equal(
        amountOfNFTs + 1
      );
      expect(await KKCContract.totalSupply()).to.be.equal(amountOfNFTs * 2);

      const tokensList1 = await KKCContract.getTokensListOwnedByUser(
        account1.address
      );
      console.log("tokensList for account1 is ", tokensList1);
      const tokensList2 = await KKCContract.getTokensListOwnedByUser(
        account2.address
      );
      console.log("tokensList for account2 is ", tokensList2);
      const allTokensList = await KKCContract.getAllTokensList();
      console.log("allTokensList is ", allTokensList);
    });
  });
});
