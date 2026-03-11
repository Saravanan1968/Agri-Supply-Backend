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


     struct DrugData {
        string urn;
        string[] drugNames;
        uint[] drugQuantities;
        uint totalQuantity;
        uint timestamp;
        bytes32 dataHash;
    }

    DrugData[] private drugRecords;

    // Event for logging new data creation
    event DrugDataCreated(string urn, uint totalQuantity, uint timestamp, bytes32 dataHash);

    /**
     * @dev Adds a new drug data record.
     * @param urn The unique identifier for the manufacturer.
     * @param drugNames Array of drug names.
     * @param drugQuantities Array of corresponding drug quantities.
     */
    function createDrugData(
        string memory urn,
        string[] memory drugNames,
        uint[] memory drugQuantities
    ) public {
        require(
            drugNames.length == drugQuantities.length,
            "Drug names and quantities must have the same length"
        );

        uint totalQuantity = 0;
        for (uint i = 0; i < drugQuantities.length; i++) {
            totalQuantity += drugQuantities[i];
        }

        uint timestamp = block.timestamp;
        bytes32 dataHash = keccak256(abi.encode(urn, drugNames, drugQuantities, totalQuantity, timestamp));


        DrugData memory newRecord = DrugData({
            urn: urn,
            drugNames: drugNames,
            drugQuantities: drugQuantities,
            totalQuantity: totalQuantity,
            timestamp: timestamp,
            dataHash: dataHash
        });

        drugRecords.push(newRecord);

        emit DrugDataCreated(urn, totalQuantity, timestamp, dataHash);
    }

    /**
     * @dev Fetches all stored drug data records.
     * @return Array of all DrugData records.
     */
    function getAllDrugData() public view returns (DrugData[] memory) {
        return drugRecords;
    }




    function getDrugDataByHash(bytes32 dataHash) public view returns (
        string memory urn,
        string[] memory drugNames,
        uint[] memory drugQuantities,
        uint totalQuantity,
        uint timestamp
    ) {
        for (uint i = 0; i < drugRecords.length; i++) {
            if (drugRecords[i].dataHash == dataHash) {
                DrugData memory record = drugRecords[i];
                return (
                    record.urn,
                    record.drugNames,
                    record.drugQuantities,
                    record.totalQuantity,
                    record.timestamp
                );
            }
        }
        revert("Drug data not found");
    }



function getDrugDataByURN(string memory urn)
    public
    view
    returns (
        string memory,
        string[] memory,
        uint256[] memory,
        uint256
    )
{
    uint256 latestTimestamp = 0;
    uint256 latestIndex = 0;

    // Iterate through drugRecords to find the matching URN and the most recent record
    for (uint i = 0; i < drugRecords.length; i++) {
        if (keccak256(abi.encodePacked(drugRecords[i].urn)) == keccak256(abi.encodePacked(urn))) {
            // Check if this record is newer than the current latest
            if (drugRecords[i].timestamp > latestTimestamp) {
                latestTimestamp = drugRecords[i].timestamp;
                latestIndex = i;
            }
        }
    }

    // If a match was found, return the most recent data
    if (latestTimestamp > 0) {
        DrugData memory data = drugRecords[latestIndex];
        return (
            data.urn,
            data.drugNames,
            data.drugQuantities,
            data.timestamp
        );
    }

    // Return empty arrays and default values when no match is found
    string[] memory emptyStringArray;
    uint256[] memory emptyUintArray;

    return ("", emptyStringArray, emptyUintArray, 0);
}















}
