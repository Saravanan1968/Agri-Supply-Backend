// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ContainerManager {
    struct Container {
        string id;
        string urn;
        string receiver;
        string containerId;
        string tamperSealNo;
        string drugName;
        uint256 quantity;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string status;
        string lockStatus;
        uint256 timestamp; // Timestamp of creation or update
    }

    // Mapping to store containers by containerId and track multiple versions
    mapping(string => Container[]) private containers;
    
    // Array to store all container IDs for iteration
    string[] private containerIds;

    address public owner;

    event ContainerAddedOrUpdated(
        string id,
        string containerId,
        string drugName,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized!");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Add or update a container
    function addOrUpdateContainer(
        string memory id,
        string memory containerId,
        string memory drugName,
        uint256 expiryDate,
        string memory lockStatus,
        uint256 manufacturingDate,
        uint256 quantity,
        string memory receiver,
        string memory status,
        string memory tamperSealNo,
        string memory urn
    ) public {
        require(bytes(containerId).length > 0, "Container ID cannot be empty");
        require(bytes(drugName).length > 0, "Drug name cannot be empty");
        require(bytes(lockStatus).length > 0, "Lock status cannot be empty");

        // Create a new container
        Container memory newContainer = Container({
            id: id,
            urn: urn,
            receiver: receiver,
            containerId: containerId,
            tamperSealNo: tamperSealNo,
            drugName: drugName,
            quantity: quantity,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            status: status,
            lockStatus: lockStatus,
            timestamp: block.timestamp // Set the current timestamp for this container
        });

        // Push the new container into the containers mapping (array of containers per containerId)
        containers[containerId].push(newContainer);

        // Add containerId to the list if it's the first time it's being used
        if (containers[containerId].length == 1) {
            containerIds.push(containerId);
        }

        // Emit an event that the container was added or updated
        emit ContainerAddedOrUpdated(id, containerId, drugName, block.timestamp);
    }

    // Fetch the most recent container for each containerId, along with all containers
    function getAllContainers() public view returns (Container[] memory) {
        Container[] memory allContainers = new Container[](containerIds.length);
        uint index = 0;

        // Iterate over each containerId
        for (uint256 i = 0; i < containerIds.length; i++) {
            string memory containerId = containerIds[i];
            Container[] memory containerVersions = containers[containerId];
            uint256 latestTimestamp = 0;
            Container memory latestContainer;

            // Find the most recent container by timestamp
            for (uint256 j = 0; j < containerVersions.length; j++) {
                if (containerVersions[j].timestamp > latestTimestamp) {
                    latestTimestamp = containerVersions[j].timestamp;
                    latestContainer = containerVersions[j];
                }
            }

            // Add the most recent container to the result list
            allContainers[index] = latestContainer;
            index++;
        }

        return allContainers;
    }

    // Helper function to get all containers for a specific containerId
    function getContainersById(string memory containerId) public view returns (Container[] memory) {
        return containers[containerId];
    }
}
