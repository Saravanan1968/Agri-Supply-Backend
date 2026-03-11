const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Use the provider to get the balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance));

    // Deploy the contract
    const ContainerManager = await hre.ethers.getContractFactory("ContainerTracking");
    const containerManager = await ContainerManager.deploy();
    await containerManager.waitForDeployment();

    console.log("ContainerManager deployed to:", containerManager.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment error:", error);
        process.exit(1);
    });
