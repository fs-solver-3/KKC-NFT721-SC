const { ethers, upgrades } = require("hardhat");

async function main() {
    const KKCTokenInstance = await ethers.getContractFactory("KKC");
    const KKCTokenContract = await KKCTokenInstance.deploy("0x390A0815e69F068C7859A9fF07A01aC54A2a9968");
    console.log("KKC Contract is deployed to:", KKCTokenContract.address);
}

main();