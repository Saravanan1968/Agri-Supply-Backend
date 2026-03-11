// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContainerManagement {
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
        uint256 timestamp;
    }

    mapping(string => Container) private containers;
    string[] private ids; // To store formData.id values

    event ContainerUpdated(string id, uint256 timestamp);

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
        // Check if container already exists
        bool isNew = keccak256(abi.encodePacked(containers[id].id)) == keccak256(abi.encodePacked(""));
        if (isNew) {
            ids.push(id);
        }

        // Update container details
        containers[id] = Container({
            id: id,
            containerId: containerId,
            drugName: drugName,
            expiryDate: expiryDate,
            lockStatus: lockStatus,
            manufacturingDate: manufacturingDate,
            quantity: quantity,
            receiver: receiver,
            status: status,
            tamperSealNo: tamperSealNo,
            urn: urn,
            timestamp: block.timestamp
        });

        emit ContainerUpdated(id, block.timestamp);
    }

    // Get all container details
    function getAllContainers() public view returns (Container[] memory) {
        Container[] memory result = new Container[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = containers[ids[i]];
        }
        return result;
    }




    // Get details of a specific container by id
    function getContainerById(string memory id) public view returns (Container memory) {
        require(bytes(containers[id].id).length != 0, "Container does not exist");
        return containers[id];
    }
}
