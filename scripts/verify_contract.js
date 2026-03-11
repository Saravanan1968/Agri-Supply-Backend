
require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
    const providerUrl = process.env.LOCAL_PROVIDER_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!providerUrl) {
        console.error("Error: LOCAL_PROVIDER_URL is not set in .env");
        return;
    }
    if (!contractAddress) {
        console.error("Error: CONTRACT_ADDRESS is not set in .env");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const code = await provider.getCode(contractAddress);

        console.log(`Checking address: ${contractAddress} on ${providerUrl}`);
        if (code === '0x') {
            console.log("Result: NO CONTRACT CODE FOUND (code size: 0)");
            console.log("The contract is NOT deployed at this address.");
        } else {
            console.log(`Result: CONTRACT FOUND (code size: ${code.length} bytes)`);
        }
    } catch (error) {
        console.error("Error connecting to provider:", error.message);
    }
}

main();
