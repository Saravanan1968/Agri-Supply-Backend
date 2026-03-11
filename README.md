# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```



# Creation of env file - add these variables:
Port=4000
MongoDbURI=your_mongo_uri
LOCAL_PROVIDER_URL=http://localhost:8545
PRIVATE_KEY=your_local_eth_account_private_key
CONTRACT_ADDRESS=deployed_contract_address


# Setup Project
Install Hardhat - npm install --save-dev hardhat
Create Hardhat project - npx hardhat
Compile Contract - npx hardhat compile
Run Local Eth Blockchain network - npx hardhat node
Deploy the smart contract - npx hardhat run scripts/deploy.js --network localhost
Run node project - node app.js/ nodemon app.js(preferred)