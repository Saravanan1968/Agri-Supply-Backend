// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContainerTracking {
    // Structure to store container data
    struct Container {
        string id;
        string containerId;
        string drugName;
        uint256 expiryDate;
        string lockStatus;
        uint256 manufacturingDate;
        uint256 quantity;
        string receiver;
        string status;
        string tamperSealNo;
        string urn;
        uint256 timestamp; // Timestamp when the container data was created
    }

    // Array to hold all container data
    Container[] public containers;

    // Mapping to store container index by its ID
    mapping(string => uint256) public containerIndexById;

    // Structure to store drug data
   // struct DrugData {
      //  string urn;
       // string[] drugNames; // Dynamic array for drug names
       // uint256[] drugQuantities; // Dynamic array for drug quantities
      //  uint256 totalQuantity;
      //  uint256 timestamp;
    //}

    // Mapping to store drug data by URN
   // mapping(string => DrugData) public drugsByUrn;

    // Array to track all URNs
   // string[] public urns;


    // Function to add a new container to the blockchain
    function createContainer(
        string memory _id,
        string memory _containerId,
        string memory _drugName,
        uint256 _expiryDate,
        string memory _lockStatus,
        uint256 _manufacturingDate,
        uint256 _quantity,
        string memory _receiver,
        string memory _status,
        string memory _tamperSealNo,
        string memory _urn
    ) public {
        uint256 currentTimestamp = block.timestamp; // Get the current block timestamp
        
        // Create a new container object
        Container memory newContainer = Container({
            id: _id,
            containerId: _containerId,
            drugName: _drugName,
            expiryDate: _expiryDate,
            lockStatus: _lockStatus,
            manufacturingDate: _manufacturingDate,
            quantity: _quantity,
            receiver: _receiver,
            status: _status,
            tamperSealNo: _tamperSealNo,
            urn: _urn,
            timestamp: currentTimestamp
        });
        
        // Add the new container to the containers array
        containers.push(newContainer);

        // Store the container index by its ID
        containerIndexById[_id] = containers.length - 1;
    }

    // Function to get all container data stored on the blockchain
    function getAllContainers() public view returns (Container[] memory) {
        return containers;
    }

    // Function to get a container by its id
    function getContainerById(string memory _id) public view returns (Container memory) {
        uint256 index = containerIndexById[_id];
        
        // Ensure the container exists
        require(index < containers.length, "Container not found");
        
        // Return the container data
        return containers[index];
    }








 // Function to create and update drug data
    //function createDrug(
       // string memory _urn,
       // string[] memory _drugNames,
       // uint256[] memory _drugQuantities,
       // uint256 _totalQuantity
    //) public {
        //require(_drugNames.length == _drugQuantities.length, "Mismatch in drugs and quantities");

        // Check if the URN already exists
       // if (drugsByUrn[_urn].timestamp == 0) {
        //    urns.push(_urn); // Add URN to the tracking array
       // }

        // Access the DrugData in storage
      //  DrugData storage drugData = drugsByUrn[_urn];

        // Update DrugData fields
      //  drugData.urn = _urn;
      //  drugData.totalQuantity = _totalQuantity;
       // drugData.timestamp = block.timestamp;

        // Clear existing arrays
       // delete drugData.drugNames;
       // delete drugData.drugQuantities;

        // Reassign updated data
       // for (uint256 i = 0; i < _drugNames.length; i++) {
       //     drugData.drugNames.push(_drugNames[i]);
        //    drugData.drugQuantities.push(_drugQuantities[i]);
       // }

   // }

    // Function to fetch all drug data stored on the blockchain
  //  function getAllDrugData() public view returns (DrugInfo[] memory) {
      //  return allDrugData;
   // }

//function getDrugData() public view returns (DrugData[] memory) {/
  //  uint256 totalDrugs = urns.length; // Number of unique URNs
   // DrugData[] memory allDrugs = new DrugData[](totalDrugs); // Create an array to store all DrugData

    // Loop through all URNs and fetch their corresponding DrugData
   // for (uint256 i = 0; i < totalDrugs; i++) {
    //    string memory urn = urns[i];
     //   allDrugs[i] = drugsByUrn[urn]; // Fetch DrugData from the mapping for each URN
    //}

    //return allDrugs; // Return the array containing all DrugData
//}









 // Define the struct to hold drug information
    struct DrugInfo {
        string urn;
        uint totalQuantity;
        uint timestamp;
        string[] drugNames;
        uint[] drugQuantities;
    }

    // Array to store all drug data entries
    DrugInfo[] public allDrugData;

    // Function to add drug data
    function addDrugData(
        string memory urn,
        uint totalQuantity,
        uint timestamp,
        string[] memory drugNames,
        uint[] memory drugQuantities
    ) public {
        DrugInfo memory newDrugData = DrugInfo({
            urn: urn,
            totalQuantity: totalQuantity,
            timestamp: timestamp,
            drugNames: drugNames,
            drugQuantities: drugQuantities
        });

        allDrugData.push(newDrugData);
    }

    // Function to fetch all drug data across all urns
    function getAllDrugData() public view returns (DrugInfo[] memory) {
        return allDrugData;
    }


























}
